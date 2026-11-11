# Tests every server route. Run from the server folder:
#   powershell -ExecutionPolicy Bypass -File .\test-api.ps1
# Optional admin part (needs an admin account listed in ADMIN_EMAILS):
#   powershell -ExecutionPolicy Bypass -File .\test-api.ps1 -AdminEmail you@example.com -AdminPassword "yourpassword"
param(
  [string]$AdminEmail = "",
  [string]$AdminPassword = ""
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "Stop"
$api = "http://localhost:5000"

# Firebase web API key comes from client/.env
$envFile = Join-Path $PSScriptRoot "..\client\.env"
if (-not (Test-Path $envFile)) { Write-Host "client\.env not found: $envFile" -ForegroundColor Red; exit 1 }
$keyLine = Get-Content $envFile | Where-Object { $_ -match "^VITE_FIREBASE_API_KEY=" } | Select-Object -First 1
$key = ($keyLine -replace "^VITE_FIREBASE_API_KEY=", "").Trim()
if (-not $key) { Write-Host "VITE_FIREBASE_API_KEY is empty in client\.env" -ForegroundColor Red; exit 1 }

$script:pass = 0
$script:fail = 0
function Check($name, $ok) {
  if ($ok) { Write-Host ("  PASS  " + $name) -ForegroundColor Green; $script:pass++ }
  else     { Write-Host ("  FAIL  " + $name) -ForegroundColor Red;   $script:fail++ }
}

# Read the error text of a failed web request (works in Windows PowerShell and PowerShell 7)
function Get-ErrorBody($err) {
  $msg = "" + $err.ErrorDetails.Message
  if ($msg) { return $msg }
  try {
    $stream = $err.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch { }
  return "" + $err.Exception.Message
}

# Log in to Firebase (create the account the first time). Returns the ID token.
function Get-Token($email, $password) {
  $body = @{ email = $email; password = $password; returnSecureToken = $true } | ConvertTo-Json
  $base = "https://identitytoolkit.googleapis.com/v1/accounts"
  $signUpError = ""
  try {
    $r = Invoke-RestMethod -Method Post -Uri "${base}:signUp?key=$key" -ContentType "application/json" -Body $body
    return $r.idToken
  } catch {
    $signUpError = Get-ErrorBody $_
  }
  # The account probably exists already, so log in instead
  try {
    $r = Invoke-RestMethod -Method Post -Uri "${base}:signInWithPassword?key=$key" -ContentType "application/json" -Body $body
    return $r.idToken
  } catch {
    throw ("Firebase failed for $email. Sign-up said: $signUpError | Login said: " + (Get-ErrorBody $_))
  }
}

# Call our API. Never throws: returns @{ status; data }
function Call($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$api$path"; Headers = $headers; ContentType = "application/json" }
  if ($null -ne $body) { $params["Body"] = ($body | ConvertTo-Json -Depth 5) }
  try {
    $data = Invoke-RestMethod @params
    return @{ status = 200; data = $data }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $data = $null
    try { $data = (Get-ErrorBody $_) | ConvertFrom-Json } catch { }
    return @{ status = $status; data = $data }
  }
}

$pw = "Test12345!"
$stamp = Get-Date -Format "HHmmss"
$jobTitle = "API Test Job $stamp"
$createdJobId = $null
$seekerId = $null

Write-Host "`n== Server ==" -ForegroundColor Cyan
$h = Call "GET" "/api/health" $null $null
Check "GET /api/health" ($h.status -eq 200 -and $h.data.ok -eq $true)
if ($h.status -ne 200) { Write-Host "Server is not running. Start it with: npm run dev" -ForegroundColor Red; exit 1 }

Write-Host "`n== Login and profile ==" -ForegroundColor Cyan
$empTok = Get-Token "apitest.employer@example.com" $pw
$seekTok = Get-Token "apitest.seeker@example.com" $pw
$r = Call "POST" "/api/auth/sync" $empTok @{ name = "API Test Employer"; role = "employer" }
Check "employer sync -> role employer" ($r.status -eq 200 -and $r.data.user.role -eq "employer")
$r = Call "POST" "/api/auth/sync" $seekTok @{ name = "API Test Seeker"; role = "seeker" }
Check "seeker sync -> role seeker" ($r.status -eq 200 -and $r.data.user.role -eq "seeker")
$seekerId = $r.data.user.id
$r = Call "GET" "/api/auth/me" $seekTok $null
Check "GET /api/auth/me" ($r.status -eq 200 -and $r.data.user.email -eq "apitest.seeker@example.com")
$r = Call "PATCH" "/api/auth/me" $seekTok @{ phone = "01700000000"; location = "Dhaka" }
Check "PATCH /api/auth/me (profile)" ($r.status -eq 200 -and $r.data.user.phone -eq "01700000000")
$r = Call "GET" "/api/auth/me" $null $null
Check "no token -> 401" ($r.status -eq 401)

Write-Host "`n== Security ==" -ForegroundColor Cyan
$r = Call "POST" "/api/jobs" $null @{ title = "x"; location = "y" }
Check "POST /api/jobs without login -> 401" ($r.status -eq 401)
$r = Call "POST" "/api/jobs" $seekTok @{ title = "x"; location = "y" }
Check "seeker cannot post a job -> 403" ($r.status -eq 403)
$r = Call "GET" "/api/users" $empTok $null
Check "employer cannot list users -> 403" ($r.status -eq 403)

Write-Host "`n== Jobs ==" -ForegroundColor Cyan
$r = Call "POST" "/api/jobs" $empTok @{ title = $jobTitle; location = "Remote"; type = "Full-time"; description = "Test"; salaryMin = 30000; salaryMax = 50000 }
Check "POST /api/jobs (employer)" ($r.status -eq 201 -or $r.status -eq 200)
$createdJobId = $r.data._id
if (-not $createdJobId) { Write-Host "Job was not created, stopping." -ForegroundColor Red; exit 1 }
$r = Call "POST" "/api/jobs" $empTok @{ title = "no location" }
Check "job without location -> 400" ($r.status -eq 400)
$r = Call "GET" "/api/jobs?search=$stamp" $null $null
Check "GET /api/jobs?search= finds the job" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $createdJobId }))
$r = Call "GET" "/api/jobs/$createdJobId" $null $null
Check "GET /api/jobs/:id" ($r.status -eq 200 -and $r.data.title -eq $jobTitle)
$r = Call "GET" "/api/jobs/123" $null $null
Check "GET /api/jobs/123 (bad id) -> 400" ($r.status -eq 400)
$r = Call "GET" "/api/jobs/mine" $empTok $null
Check "GET /api/jobs/mine" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $createdJobId }))
$r = Call "PATCH" "/api/jobs/$createdJobId" $seekTok @{ title = "hacked" }
Check "seeker cannot edit a job -> 403" ($r.status -eq 403)
$r = Call "PATCH" "/api/jobs/$createdJobId" $empTok @{ location = "Dhaka" }
Check "employer edits own job" ($r.status -eq 200 -and $r.data.location -eq "Dhaka")

Write-Host "`n== Applications ==" -ForegroundColor Cyan
$r = Call "POST" "/api/applications" $seekTok @{ jobId = $createdJobId; coverLetter = "Hello" }
Check "seeker applies" ($r.status -eq 201 -or $r.status -eq 200)
$appId = $r.data._id
$r = Call "POST" "/api/applications" $seekTok @{ jobId = $createdJobId }
Check "apply twice -> 409" ($r.status -eq 409)
$r = Call "POST" "/api/applications" $empTok @{ jobId = $createdJobId }
Check "employer cannot apply -> 403" ($r.status -eq 403)
$r = Call "GET" "/api/applications/mine" $seekTok $null
Check "seeker sees own applications" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $appId }))
$r = Call "GET" "/api/applications/employer" $empTok $null
Check "employer sees applicants" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $appId }))
$r = Call "PATCH" "/api/applications/$appId" $empTok @{ status = "Foo" }
Check "invalid status -> 400" ($r.status -eq 400)
$r = Call "PATCH" "/api/applications/$appId" $seekTok @{ status = "Selected" }
Check "seeker cannot change status -> 403" ($r.status -eq 403)
$r = Call "PATCH" "/api/applications/$appId" $empTok @{ status = "Interview" }
Check "employer sets status Interview" ($r.status -eq 200 -and $r.data.status -eq "Interview")

Write-Host "`n== Notifications ==" -ForegroundColor Cyan
$r = Call "GET" "/api/notifications" $seekTok $null
Check "seeker got a status notification" ($r.status -eq 200 -and (@($r.data.items) | Where-Object { $_.text -like "*Interview*" }))
$r = Call "GET" "/api/notifications" $empTok $null
Check "employer got an 'applied' notification" ($r.status -eq 200 -and (@($r.data.items) | Where-Object { $_.text -like "*applied*" }))
$r = Call "PATCH" "/api/notifications/read-all" $seekTok $null
Check "mark all read" ($r.status -eq 200)
$r = Call "GET" "/api/notifications" $seekTok $null
Check "unread count is 0" ($r.status -eq 200 -and $r.data.unread -eq 0)

Write-Host "`n== Saved jobs ==" -ForegroundColor Cyan
$r = Call "POST" "/api/saved/$createdJobId" $seekTok $null
Check "save a job" ($r.status -eq 201 -or $r.status -eq 200)
$r = Call "POST" "/api/saved/$createdJobId" $seekTok $null
Check "save twice does not fail" ($r.status -eq 200)
$r = Call "GET" "/api/saved" $seekTok $null
Check "GET /api/saved lists it" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_.job._id -eq $createdJobId }))
$r = Call "DELETE" "/api/saved/$createdJobId" $seekTok $null
Check "unsave" ($r.status -eq 200)

Write-Host "`n== Company ==" -ForegroundColor Cyan
$r = Call "PUT" "/api/companies/mine" $empTok @{ name = "API Test Company"; industry = "Software"; location = "Dhaka" }
Check "employer saves company profile" ($r.status -eq 200 -and $r.data.name -eq "API Test Company")
$r = Call "GET" "/api/companies/mine" $empTok $null
Check "GET /api/companies/mine" ($r.status -eq 200 -and $r.data.industry -eq "Software")

Write-Host "`n== Stats ==" -ForegroundColor Cyan
$r = Call "GET" "/api/stats/employer" $empTok $null
Check "employer stats" ($r.status -eq 200 -and $r.data.totalJobs -ge 1 -and $r.data.applicants -ge 1)
$r = Call "GET" "/api/stats/seeker" $seekTok $null
Check "seeker stats" ($r.status -eq 200 -and $r.data.applications -ge 1)

Write-Host "`n== Close a job ==" -ForegroundColor Cyan
$r = Call "PATCH" "/api/jobs/$createdJobId" $empTok @{ status = "Closed" }
Check "employer closes the job" ($r.status -eq 200 -and $r.data.status -eq "Closed")
$r = Call "GET" "/api/jobs?search=$stamp" $null $null
Check "closed job is hidden from the public list" ($r.status -eq 200 -and -not (@($r.data) | Where-Object { $_._id -eq $createdJobId }))
$r = Call "POST" "/api/applications" $seekTok @{ jobId = $createdJobId }
Check "cannot apply to a closed job -> 400" ($r.status -eq 400)

if ($AdminEmail -and $AdminPassword) {
  Write-Host "`n== Admin ==" -ForegroundColor Cyan
  $admTok = Get-Token $AdminEmail $AdminPassword
  $r = Call "POST" "/api/auth/sync" $admTok @{ name = "API Test Admin" }
  Check "admin sync -> role admin" ($r.status -eq 200 -and $r.data.user.role -eq "admin")
  $r = Call "GET" "/api/users?search=apitest" $admTok $null
  Check "admin lists users (search)" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_.email -eq "apitest.seeker@example.com" }))
  $r = Call "PATCH" "/api/users/$seekerId" $admTok @{ status = "Suspended" }
  Check "admin suspends the seeker" ($r.status -eq 200 -and $r.data.status -eq "Suspended")
  $r = Call "GET" "/api/auth/me" $seekTok $null
  Check "suspended seeker is blocked -> 403" ($r.status -eq 403)
  $r = Call "PATCH" "/api/users/$seekerId" $admTok @{ status = "Active" }
  Check "admin reactivates the seeker" ($r.status -eq 200 -and $r.data.status -eq "Active")
  $r = Call "GET" "/api/auth/me" $seekTok $null
  Check "seeker can log in again" ($r.status -eq 200)
  $r = Call "GET" "/api/jobs/admin/all" $admTok $null
  Check "admin lists all jobs" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $createdJobId }))
  $r = Call "GET" "/api/applications" $admTok $null
  Check "admin lists all applications" ($r.status -eq 200 -and (@($r.data) | Where-Object { $_._id -eq $appId }))
  $r = Call "GET" "/api/companies" $admTok $null
  Check "admin lists companies" ($r.status -eq 200 -and $r.data.Count -ge 1)
  $comp = (@($r.data) | Where-Object { $_.name -eq "API Test Company" } | Select-Object -First 1)
  if ($comp) {
    $r = Call "PATCH" "/api/companies/$($comp._id)" $admTok @{ status = "Approved" }
    Check "admin approves the company" ($r.status -eq 200 -and $r.data.status -eq "Approved")
  }
  $r = Call "GET" "/api/stats/admin" $admTok $null
  Check "admin stats" ($r.status -eq 200 -and $r.data.users -ge 2)
  $r = Call "DELETE" "/api/users/$seekerId" $admTok $null
  Check "admin deletes the test seeker" ($r.status -eq 200)
  $r = Call "GET" "/api/auth/me" $seekTok $null
  Check "deleted user has no profile -> 403" ($r.status -eq 403)
} else {
  Write-Host "`n(Admin tests skipped. Run with -AdminEmail and -AdminPassword to test them.)" -ForegroundColor Yellow
}

Write-Host "`n== Clean up ==" -ForegroundColor Cyan
$r = Call "DELETE" "/api/jobs/$createdJobId" $empTok $null
Check "employer deletes the job" ($r.status -eq 200)
$r = Call "GET" "/api/jobs/$createdJobId" $null $null
Check "deleted job -> 404" ($r.status -eq 404)

Write-Host ""
$color = "Green"; if ($script:fail -gt 0) { $color = "Red" }
Write-Host ("RESULT: " + $script:pass + " passed, " + $script:fail + " failed") -ForegroundColor $color

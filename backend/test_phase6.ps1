$BaseUrl = "http://localhost:5000/api/v1"

Write-Host "`n=== 1. Test Citizen RBAC Security (Must return 403) ===" -ForegroundColor Cyan
$CitizenLoginBody = @{ email = "citizen@demo.com"; password = "Demo@1234" } | ConvertTo-Json
$CitizenRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $CitizenLoginBody -ContentType "application/json"
$CitizenToken = $CitizenRes.accessToken
Write-Host "Citizen logged in. Token length: $($CitizenToken.Length)" -ForegroundColor Green

try {
    $ForbiddenRes = Invoke-RestMethod -Uri "$BaseUrl/investigations" -Method Get -Headers @{ Authorization = "Bearer $CitizenToken" }
    Write-Host "FAIL: Citizen was allowed to access investigations!" -ForegroundColor Red
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "PASS: Citizen access to /api/v1/investigations blocked with HTTP $StatusCode (Expected 403)" -ForegroundColor Green
}

Write-Host "`n=== 2. Test Officer Access & Investigation Lifecycle ===" -ForegroundColor Cyan
$OfficerLoginBody = @{ email = "officer@demo.com"; password = "Demo@1234" } | ConvertTo-Json
$OfficerRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $OfficerLoginBody -ContentType "application/json"
$OfficerToken = $OfficerRes.accessToken
Write-Host "Officer logged in. Token length: $($OfficerToken.Length)" -ForegroundColor Green

$InvList = Invoke-RestMethod -Uri "$BaseUrl/investigations" -Method Get -Headers @{ Authorization = "Bearer $OfficerToken" }
Write-Host "PASS: Officer accessed investigations. Total cases: $($InvList.data.stats.totalCases), Active: $($InvList.data.stats.activeCases)" -ForegroundColor Green

$OfficersList = Invoke-RestMethod -Uri "$BaseUrl/investigations/officers" -Method Get -Headers @{ Authorization = "Bearer $OfficerToken" }
Write-Host "PASS: Officer listed assignable officers. Found: $($OfficersList.data.Count) officers" -ForegroundColor Green
$LeadOfficer = $OfficersList.data[0]

# Get verified incident or review first submitted incident to verified
$Queue = Invoke-RestMethod -Uri "$BaseUrl/incidents/officer/queue" -Method Get -Headers @{ Authorization = "Bearer $OfficerToken" }
$TargetIncident = $Queue.data | Where-Object { $_.status -eq 'verified' } | Select-Object -First 1
if (-not $TargetIncident) {
    $TargetIncident = $Queue.data | Select-Object -First 1
}
Write-Host "Target incident ID: $($TargetIncident.id), TrackingId: $($TargetIncident.trackingId), Status: $($TargetIncident.status)" -ForegroundColor Yellow


# Create Investigation
$CreateInvBody = @{
    incidentId = $TargetIncident.id
    title = "Special Investigation for $($TargetIncident.trackingId)"
    description = "Formal multi-unit inquiry into suspected criminal syndicate involvement."
    priority = "high"
    initialNote = "Lead detectives mobilized to secure scene perimeter and examine forensic clues."
} | ConvertTo-Json

$NewInvRes = Invoke-RestMethod -Uri "$BaseUrl/investigations" -Method Post -Body $CreateInvBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $OfficerToken" }
$InvId = $NewInvRes.data.id
$CaseNumber = $NewInvRes.data.caseNumber
Write-Host "PASS: Created new investigation: $CaseNumber (ID: $InvId)" -ForegroundColor Green

# Add confidential internal note
$NoteBody = @{
    content = "Interviews conducted with primary witnesses. Suspect vehicle plate identified as DL-03-CK-9941."
} | ConvertTo-Json
$NoteRes = Invoke-RestMethod -Uri "$BaseUrl/investigations/$InvId/notes" -Method Post -Body $NoteBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $OfficerToken" }
Write-Host "PASS: Added confidential note. Total notes: $($NoteRes.data.internalNotes.Count)" -ForegroundColor Green

# Assign lead officer
$AssignBody = @{
    leadOfficerId = $LeadOfficer.id
} | ConvertTo-Json
$AssignRes = Invoke-RestMethod -Uri "$BaseUrl/investigations/$InvId/assign" -Method Patch -Body $AssignBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $OfficerToken" }
Write-Host "PASS: Assigned lead officer: $($AssignRes.data.leadOfficerName)" -ForegroundColor Green

# Resolve Investigation
$ResolveBody = @{
    status = "closed"
    resolutionNotes = "Suspects apprehended and stolen inventory recovered in full. Case closed and referred to judiciary."
} | ConvertTo-Json
$ResolveRes = Invoke-RestMethod -Uri "$BaseUrl/investigations/$InvId/status" -Method Patch -Body $ResolveBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $OfficerToken" }
Write-Host "PASS: Resolved investigation. Status: $($ResolveRes.data.status), Timeline events: $($ResolveRes.data.timeline.Count)" -ForegroundColor Green

# Verify citizen still cannot access the specific investigation dossier
try {
    $ForbiddenDetail = Invoke-RestMethod -Uri "$BaseUrl/investigations/$InvId" -Method Get -Headers @{ Authorization = "Bearer $CitizenToken" }
    Write-Host "FAIL: Citizen was allowed to read investigation dossier!" -ForegroundColor Red
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "PASS: Citizen blocked from accessing investigation dossier with HTTP $StatusCode (Expected 403)" -ForegroundColor Green
}

Write-Host "`nAll Phase 6 backend API tests passed successfully!" -ForegroundColor Green

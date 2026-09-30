$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"
function J($o) { $o | ConvertTo-Json -Depth 8 -Compress }

# 1) login
$login = Invoke-RestMethod -Uri "$base/auth/login/password" -Method Post -ContentType "application/json" -Body '{"phone":"13800138000","password":"Test123456"}'
$H = @{ Authorization = "Bearer $($login.token)" }
Write-Host "[1] LOGIN ok userId=$($login.user.id)"

# 2) default member
$members = Invoke-RestMethod -Uri "$base/family-members" -Headers $H
$mem = if ($members -is [array]) { $members } else { $members.members }
$m0 = ($mem | Where-Object { $_.isDefault } | Select-Object -First 1)
if (-not $m0) { $m0 = $mem[0] }
$memberId = $m0.id
Write-Host "[2] MEMBER id=$memberId"

# 3) report1 with numeric items
$r1 = @{
  memberId = $memberId; reportType = "LAB"; categoryL1 = "BloodTest"; categoryL2 = "CBC"
  hospital = "PekingUnion"; reportDate = "2026-01-15"; summary = "CBC recheck"
  items = @(
    @{ name = "WBC"; value = "6.5"; unit = "10^9/L"; isNumeric = $true; referenceMin = 3.5; referenceMax = 9.5; abnormal = "NORMAL" },
    @{ name = "HGB"; value = "130"; unit = "g/L"; isNumeric = $true; referenceMin = 130; referenceMax = 175; abnormal = "NORMAL" }
  )
}
$rep1 = Invoke-RestMethod -Uri "$base/reports" -Method Post -Headers $H -ContentType "application/json" -Body (J $r1)
Write-Host "[3] REPORT1 id=$($rep1.id) items=$($rep1.items.Count)"

# 4) report2 (same item, later date -> trend)
$r2 = @{
  memberId = $memberId; reportType = "LAB"; categoryL1 = "BloodTest"; categoryL2 = "CBC"
  hospital = "PekingUnion"; reportDate = "2026-06-15"; summary = "CBC recheck2"
  items = @(@{ name = "WBC"; value = "7.8"; unit = "10^9/L"; isNumeric = $true; referenceMin = 3.5; referenceMax = 9.5; abnormal = "NORMAL" })
}
$rep2 = Invoke-RestMethod -Uri "$base/reports" -Method Post -Headers $H -ContentType "application/json" -Body (J $r2)
Write-Host "[4] REPORT2 id=$($rep2.id)"

# 5) list
$list = Invoke-RestMethod -Uri "$base/reports" -Headers $H
Write-Host "[5] LIST total=$($list.total) itemsKey=$($null -ne $list.items) count=$($list.items.Count)"

# 6) detail
$detail = Invoke-RestMethod -Uri "$base/reports/$($rep1.id)" -Headers $H
Write-Host "[6] DETAIL id=$($detail.id) items=$($detail.items.Count) member=$($detail.member.name)"

# 7) dashboard (no memberId)
$dash = Invoke-RestMethod -Uri "$base/reports/dashboard" -Headers $H
Write-Host "[7] DASH totalReports=$($dash.totalReports) recent=$($dash.recentReports.Count) trackable=$($dash.trackableItems.Count)"

# 8) trackable-items
$track = Invoke-RestMethod -Uri "$base/reports/trackable-items?memberId=$memberId" -Headers $H
$tnames = ($track | ForEach-Object { $_.name }) -join ","
Write-Host "[8] TRACKABLE count=$($track.Count) names=$tnames"

# 9) trend - confirm date field name
$trendUri = "$base/reports/trend?memberId=$memberId&itemName=WBC"
$trend = Invoke-RestMethod -Uri $trendUri -Headers $H
$first = $trend[0]
$props = ($first.PSObject.Properties.Name) -join ","
Write-Host "[9] TREND points=$($trend.Count) fields=$props"
Write-Host "    date?=$($null -ne $first.PSObject.Properties['date']) reportDate?=$($null -ne $first.PSObject.Properties['reportDate']) value=$($first.value)"

# 10) diagnosis create + list
$dg = @{ memberId = $memberId; visitDate = "2026-07-01"; hospital = "PekingUnion"; department = "Internal"; complaint = "dizziness"; diagnosisText = "HTN observe"; advice = "low salt, revisit 2w" }
$dgRes = Invoke-RestMethod -Uri "$base/diagnoses" -Method Post -Headers $H -ContentType "application/json" -Body (J $dg)
$dgList = Invoke-RestMethod -Uri "$base/diagnoses" -Headers $H
$dgTop = ($dgList.PSObject.Properties.Name) -join ","
Write-Host "[10] DIAGNOSIS id=$($dgRes.id) listShape=[$($dgTop)] itemsKey=$($null -ne $dgList.items)"

# 11) medication create + list + current
$md = @{ memberId = $memberId; drugName = "Aspirin"; specification = "100mg"; category = "WESTERN"; usage = "oral"; dosage = "1 tab"; frequency = "daily"; startDate = "2026-07-01"; status = "USING" }
$mdRes = Invoke-RestMethod -Uri "$base/medications" -Method Post -Headers $H -ContentType "application/json" -Body (J $md)
$mdList = Invoke-RestMethod -Uri "$base/medications" -Headers $H
$cur = Invoke-RestMethod -Uri "$base/medications/current" -Headers $H
$curCount = if ($cur -is [array]) { $cur.Count } else { 1 }
Write-Host "[11] MEDICATION id=$($mdRes.id) listItemsKey=$($null -ne $mdList.items) currentIsArray=$($cur -is [array]) currentCount=$curCount"

Write-Host "`n=== E2E DONE ==="

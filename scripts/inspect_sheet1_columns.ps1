Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "scratch/test.xlsx").Path)
$strings = @()
$ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
if ($ssEntry) {
  $reader = New-Object System.IO.StreamReader($ssEntry.Open())
  $ssXml = [xml]$reader.ReadToEnd()
  foreach ($si in $ssXml.sst.si) {
    if ($si.t) { $strings += $si.t }
    elseif ($si.r) {
      $txt = ""
      foreach ($r in $si.r) { $txt += $r.t }
      $strings += $txt
    } else { $strings += "" }
  }
}

$entry = $zip.GetEntry("xl/worksheets/sheet1.xml")
$xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()

$hasPPBCycle = 0
$hasStage = 0
$phases = @{}
$stages = @{}

foreach ($row in $xml.worksheet.sheetData.row) {
  if ([int]$row.r -ge 3) {
    $rowCells = @{}
    foreach ($c in $row.c) {
      $col = ($c.r -replace '\d+', '')
      $val = $c.v
      if ($c.t -eq 's') { $val = $strings[[int]$val] }
      $rowCells[$col] = $val
    }
    $ph = $rowCells['I']
    $cycle = $rowCells['J']
    $stg = $rowCells['L']

    if ($cycle) { $hasPPBCycle++ }
    if ($stg) {
      $hasStage++
      if (-not $stages.ContainsKey($stg)) { $stages[$stg] = 0 }
      $stages[$stg]++
    }
    if ($ph) {
      if (-not $phases.ContainsKey($ph)) { $phases[$ph] = 0 }
      $phases[$ph]++
    }
  }
}

Write-Host "Total data rows in Sheet 1: $($xml.worksheet.sheetData.row.Count - 2)"
Write-Host "Rows with PPBs Cycle (Col J): $hasPPBCycle"
Write-Host "Rows with Current Stage (Col L): $hasStage"
Write-Host "`nPhases in Sheet 1:"
foreach ($k in $phases.Keys) { Write-Host "   $k : $($phases[$k])" }
Write-Host "`nStages in Sheet 1:"
foreach ($k in $stages.Keys) { Write-Host "   $k : $($stages[$k])" }

$zip.Dispose()

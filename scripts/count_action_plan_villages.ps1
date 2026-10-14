Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'scratch/test.xlsx').Path)

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

$entry = $zip.GetEntry('xl/worksheets/sheet3.xml')
$reader = New-Object System.IO.StreamReader($entry.Open())
$xml = [xml]$reader.ReadToEnd()

# Columns for village codes: D, N, Z, AJ, AU, BE, BO, BZ
$sections = @(
  @{ targetMonthCol = 'A'; codeCol = 'D'; vilCol = 'C'; manCol = 'B'; stage = 'Mar-27 (GT Ongoing / Phase 6)' },
  @{ targetMonthCol = 'K'; codeCol = 'N'; vilCol = 'M'; manCol = 'L'; stage = 'Feb-27 (Phase 7)' },
  @{ targetMonthCol = 'W'; codeCol = 'Z'; vilCol = 'Y'; manCol = 'X'; stage = 'Jan-27 (Phase 5)' },
  @{ targetMonthCol = 'AG'; codeCol = 'AJ'; vilCol = 'AI'; manCol = 'AH'; stage = 'Dec-26 (Phase 4/5)' },
  @{ targetMonthCol = 'AR'; codeCol = 'AU'; vilCol = 'AT'; manCol = 'AS'; stage = 'Nov-26 (13 Completed)' },
  @{ targetMonthCol = 'BB'; codeCol = 'BE'; vilCol = 'BD'; manCol = 'BC'; stage = 'Oct-26 (Final ROR)' },
  @{ targetMonthCol = 'BL'; codeCol = 'BO'; vilCol = 'BN'; manCol = 'BM'; stage = 'Sep-26 (PPB Distribution)' },
  @{ targetMonthCol = 'BW'; codeCol = 'BZ'; vilCol = 'BY'; manCol = 'BX'; stage = 'Aug-26 (PPB Completed)' }
)

$counts = @{}
$totalVillages = 0

foreach ($sec in $sections) {
  $counts[$sec.stage] = 0
}

foreach ($row in $xml.worksheet.sheetData.row) {
  $rNum = [int]$row.r
  if ($rNum -ge 3) {
    foreach ($c in $row.c) {
      $ref = $c.r
      $col = $ref -replace '\d+', ''
      $val = $c.v
      if ($c.t -eq 's') { $val = $strings[[int]$val] }
      
      foreach ($sec in $sections) {
        if ($col -eq $sec.codeCol -and $val -and $val -ne '') {
          $counts[$sec.stage]++
          $totalVillages++
        }
      }
    }
  }
}

Write-Host "Total village occurrences in ActionPlan: $totalVillages"
foreach ($k in $counts.Keys) {
  Write-Host "   $k : $($counts[$k]) villages"
}

$zip.Dispose()

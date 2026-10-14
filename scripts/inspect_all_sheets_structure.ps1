Add-Type -AssemblyName System.IO.Compression.FileSystem

function Inspect-Workbook($path, $name) {
  Write-Host "`n======================================================="
  Write-Host "WORKBOOK: $name ($path)"
  Write-Host "======================================================="
  if (-not (Test-Path $path)) { Write-Host "File not found!"; return }
  
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $path).Path)

  # Read shared strings
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

  # Workbook sheets
  $wbEntry = $zip.GetEntry('xl/workbook.xml')
  $wbXml = [xml](New-Object System.IO.StreamReader($wbEntry.Open())).ReadToEnd()
  $relEntry = $zip.GetEntry('xl/_rels/workbook.xml.rels')
  $relXml = [xml](New-Object System.IO.StreamReader($relEntry.Open())).ReadToEnd()

  $sheetMap = @{}
  foreach ($rel in $relXml.Relationships.Relationship) {
    $sheetMap[$rel.Id] = $rel.Target
  }

  foreach ($s in $wbXml.workbook.sheets.sheet) {
    $sName = $s.name
    $sId = $s.sheetId
    $rId = $s.'id'
    $target = $sheetMap[$rId]
    Write-Host "`n--- Sheet: '$sName' (Id: $sId, Target: $target) ---"
    
    $partPath = "xl/" + $target.TrimStart('/')
    if ($target.StartsWith('/')) { $partPath = $target.TrimStart('/') }
    $sEntry = $zip.GetEntry($partPath)
    if (-not $sEntry) {
      # try without xl/ or direct
      $sEntry = $zip.GetEntry("xl/worksheets/sheet$sId.xml")
    }
    if ($sEntry) {
      $sReader = New-Object System.IO.StreamReader($sEntry.Open())
      $sXml = [xml]$sReader.ReadToEnd()
      $rCount = 0
      foreach ($row in $sXml.worksheet.sheetData.row) {
        $rCount++
        if ($rCount -le 3) {
          $vals = @()
          foreach ($c in $row.c) {
            $val = $c.v
            if ($c.t -eq 's') { $val = $strings[[int]$val] }
            if ($val) { $vals += ($c.r + '=' + $val) }
          }
          Write-Host ("   Row " + $row.r + ": " + ($vals[0..15] -join ' | ') + $(if($vals.Count -gt 16){" ... (+"+($vals.Count-16)+" more cols)"}else{""}))
        }
      }
    } else {
      Write-Host "   Entry not found for $partPath"
    }
  }

  $zip.Dispose()
}

Inspect-Workbook "scratch/test.xlsx" "PPB Universe"
Inspect-Workbook "scratch/phase5.xlsx" "Phase 5"
Inspect-Workbook "scratch/phase6.xlsx" "Phase 6"
Inspect-Workbook "scratch/phase4.xlsx" "Phase 4"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'scratch/test.xlsx').Path)

$strings = @()
$ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
if ($ssEntry) {
  $reader = New-Object System.IO.StreamReader($ssEntry.Open())
  $ssXml = [xml]$reader.ReadToEnd()
  foreach ($si in $ssXml.sst.si) {
    if ($si.t) {
      $strings += $si.t
    } elseif ($si.r) {
      $txt = ""
      foreach ($r in $si.r) { $txt += $r.t }
      $strings += $txt
    } else {
      $strings += ""
    }
  }
}

$entry = $zip.GetEntry('xl/worksheets/sheet3.xml')
$reader = New-Object System.IO.StreamReader($entry.Open())
$xml = [xml]$reader.ReadToEnd()

foreach ($row in $xml.worksheet.sheetData.row) {
  $rNum = [int]$row.r
  if ($rNum -le 4) {
    $vals = @()
    foreach ($c in $row.c) {
      $val = $c.v
      if ($c.t -eq 's') {
        $val = $strings[[int]$val]
      }
      if ($val) {
        $vals += ($c.r + '=' + $val)
      }
    }
    Write-Host ("Row $rNum : " + ($vals -join ' | '))
  }
}

$zip.Dispose()

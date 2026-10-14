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

$xml = [xml](New-Object System.IO.StreamReader($zip.GetEntry('xl/worksheets/sheet2.xml').Open())).ReadToEnd()
foreach ($row in $xml.worksheet.sheetData.row) {
  foreach ($c in $row.c) {
    if ($c.r.StartsWith('D') -and $c.v -eq '1061010.0') {
      foreach ($cell in $row.c) {
        $val = $cell.v
        if ($cell.t -eq 's') { $val = $strings[[int]$val] }
        Write-Host "$($cell.r)=$val"
      }
    }
  }
}
$zip.Dispose()

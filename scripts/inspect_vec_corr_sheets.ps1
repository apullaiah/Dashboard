Add-Type -AssemblyName System.IO.Compression.FileSystem

function Inspect-SheetRows($filePath, $sheetPattern) {
    Write-Host "`n======================================================="
    Write-Host "FILE: $filePath | PATTERN: $sheetPattern"
    Write-Host "======================================================="
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $filePath).Path)
    
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

    $wbXml = [xml](New-Object System.IO.StreamReader($zip.GetEntry('xl/workbook.xml').Open())).ReadToEnd()
    $relXml = [xml](New-Object System.IO.StreamReader($zip.GetEntry('xl/_rels/workbook.xml.rels').Open())).ReadToEnd()

    $sheetMap = @{}
    foreach ($rel in $relXml.Relationships.Relationship) {
        $sheetMap[$rel.Id] = $rel.Target
    }

    foreach ($s in $wbXml.workbook.sheets.sheet) {
        if ($s.name -match $sheetPattern) {
            $rId = $s.id
            $target = $sheetMap[$rId]
            $partPath = "xl/" + $target.TrimStart('/')
            Write-Host "`n--- MATCH: Sheet '$($s.name)' (target: $partPath) ---"
            $sEntry = $zip.GetEntry($partPath)
            if ($sEntry) {
                $sXml = [xml](New-Object System.IO.StreamReader($sEntry.Open())).ReadToEnd()
                $rNum = 0
                foreach ($row in $sXml.worksheet.sheetData.row) {
                    $rNum++
                    $rowVals = @()
                    foreach ($c in $row.c) {
                        $val = $c.v
                        if ($c.t -eq 's') { $val = $strings[[int]$val] }
                        if ($val) { $rowVals += ($c.r + "=" + $val) }
                    }
                    if ($rowVals.Count -gt 0) {
                        Write-Host "  R$($row.r): " ($rowVals -join " | ")
                    }
                }
            }
        }
    }
    $zip.Dispose()
}

Inspect-SheetRows "scratch/phase4.xlsx" "Vector|Correlation"
Inspect-SheetRows "scratch/phase5.xlsx" "Vector|Correlation"
Inspect-SheetRows "scratch/phase6.xlsx" "Vector|Correlation"

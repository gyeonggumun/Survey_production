param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'

if (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
  throw 'OutputDirectory에는 저장소 밖의 절대 경로를 입력하세요.'
}

$destination = [System.IO.Path]::GetFullPath($OutputDirectory)
$repository = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repositoryPrefix = $repository.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
if ($destination -eq $repository -or $destination.StartsWith($repositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw '개인정보가 포함된 백업을 저장소 안에 저장할 수 없습니다.'
}

foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD')) {
  if (-not [System.Environment]::GetEnvironmentVariable($name)) {
    throw "$name 환경 변수가 필요합니다. 비밀번호를 명령 인수나 저장소 파일에 넣지 마세요."
  }
}

$dump = Get-Command pg_dump -ErrorAction Stop
$restore = Get-Command pg_restore -ErrorAction Stop
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$archive = Join-Path $destination "survey-production-$stamp.dump"
if (Test-Path -LiteralPath $archive) {
  throw "백업 파일이 이미 있습니다: $archive"
}

& $dump.Source --format=custom --no-owner --no-acl --schema=public --schema=auth --file=$archive
if ($LASTEXITCODE -ne 0) {
  Remove-Item -LiteralPath $archive -ErrorAction SilentlyContinue
  throw 'pg_dump가 실패했습니다. 연결 정보와 데이터베이스 권한을 확인하세요.'
}

& $restore.Source --list $archive | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw '백업 파일 검증에 실패했습니다. 이 파일을 복구용으로 사용하지 마세요.'
}

$hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
Write-Output "백업 완료: $archive"
Write-Output "SHA256: $($hash.Hash)"
Write-Output '복구 가능 여부는 별도 테스트 프로젝트에서 실제 복원하여 확인해야 합니다.'

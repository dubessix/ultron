import { IpcMain } from 'electron'
import { exec } from 'child_process'
import os from 'os'

export default function registerLocationHandlers(ipcMain: IpcMain) {
  ipcMain.removeHandler('get-live-location')

  const runCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve) => {
      exec(cmd, (error, stdout) => {
        if (error) {
          return resolve('')
        }
        resolve(stdout ? stdout.trim() : '')
      })
    })
  }

  ipcMain.handle('get-live-location', async () => {
    try {
      const platform = os.platform()
      let osLocation = ''

      if (platform === 'linux') {
        // ─── Linux: Try geoclue2 ───
        // First try: use dbus-send to talk to geoclue2
        const geoclueCmd = `dbus-send --system --dest=org.freedesktop.GeoClue2 --type=method_call --print-reply /org/freedesktop/GeoClue2/Manager org.freedesktop.GeoClue2.Manager.GetClient 2>/dev/null || echo ""`
        const clientPath = await runCommand(geoclueCmd)

        if (clientPath && clientPath.includes('/org/freedesktop/GeoClue2')) {
          // Alternative: use where-am-i tool if geoclue2 is installed
          const whereAmICmd = `where-am-i -t 2>/dev/null || python3 -c "
import subprocess, json
result = subprocess.run(['curl', '-s', 'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'], capture_output=True, text=True)
data = json.loads(result.stdout)
if 'latitude' in data:
    print(f\"{data['latitude']},{data['longitude']}\")
" 2>/dev/null || echo ""`
          osLocation = await runCommand(whereAmICmd)
        }

        // Fallback: IP-based geolocation (no GPS but works everywhere)
        if (!osLocation || !osLocation.includes(',')) {
          const ipGeoCmd = `curl -s "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en" 2>/dev/null`
          const ipGeoOutput = await runCommand(ipGeoCmd)

          if (ipGeoOutput) {
            try {
              const data = JSON.parse(ipGeoOutput)
              if (data.latitude && data.longitude) {
                osLocation = `${data.latitude},${data.longitude}`
              }
            } catch (e) {
              // parse error, fallback
            }
          }
        }
      } else {
        // ─── Windows: PowerShell Geolocation ───
        const psCommand = `Add-Type -AssemblyName System.Device; $w = New-Object System.Device.Location.GeoCoordinateWatcher; $w.Start(); $t = 0; while($w.Position.Location.IsUnknown -and $t -lt 15) { Start-Sleep -Milliseconds 300; $t++ }; if(!$w.Position.Location.IsUnknown) { Write-Output "$($w.Position.Location.Latitude),$($w.Position.Location.Longitude)" }`
        osLocation = await runCommand(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`)
      }

      if (osLocation && osLocation.includes(',')) {
        const [lat, lon] = osLocation.split(',')

        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        )

        const geoData = await geoRes.json()

        return {
          success: true,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          city: geoData.city || 'Unknown',
          country: geoData.countryName || 'Unknown',
          region: geoData.principalSubdivision || 'Unknown',
          address: `${geoData.city || 'Unknown'}, ${geoData.principalSubdivision || ''}, ${geoData.countryName || 'Unknown'}`
        }
      }

      return { success: false, error: 'Could not determine location.' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}

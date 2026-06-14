import fs from 'fs'
import path from 'path'
import { IpcMain, App } from 'electron'
import { exec } from 'child_process'
import axios from 'axios'

export default function registerIrisCoder({ ipcMain, app }: { ipcMain: IpcMain; app: App }) {
  const PROJECTS_DIR = path.resolve(app.getPath('userData'), 'Projects')
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })

  ipcMain.handle('start-live-coding', async (event, { prompt, filename, geminiKey }) => {
    try {
      const filePath = path.join(PROJECTS_DIR, filename)

      fs.writeFileSync(filePath, '// Boss, connection established. Waiting for AI stream...\n')

      if (!geminiKey || geminiKey.trim() === '') {
        throw new Error('Missing Gemini API Key. Please configure it in the Command Center Vault.')
      }

      const response = await axios.post(
        'https://api.aimlapi.com/v1/chat/completions',
        {
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: `You are an elite developer. Write the code for: "${prompt}". Output ONLY the raw code for the file ${filename}. Do NOT wrap it in markdown blockquotes.`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${geminiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const fullCode = response.data.choices[0]?.message?.content || ''

      // Simulate streaming chunks to the frontend UI
      const words = fullCode.split(' ')
      let currentText = ''
      for (let i = 0; i < words.length; i += 8) {
        const chunk = words.slice(i, i + 8).join(' ') + ' '
        event.sender.send('live-code-chunk', chunk)
        await new Promise((r) => setTimeout(r, 20))
      }

      fs.writeFileSync(filePath, fullCode)
      return { success: true, filePath }
    } catch (err) {
      event.sender.send('live-code-chunk', `\n\n❌ [SYSTEM FAILURE]: ${String(err)}`)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('open-in-vscode', async (_event, filePath) => {
    try {
      exec(`code "${filePath}"`)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}

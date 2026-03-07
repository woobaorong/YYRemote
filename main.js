const { app, BrowserWindow, Tray, Menu, clipboard } = require("electron")
const WebSocket = require("ws")
const { exec } = require("child_process")
const path = require("path")

let win
let tray

function createWindow() {

  win = new BrowserWindow({
    width: 400,
    height: 300
  })

  win.loadFile("index.html")

  win.on("close", (e) => {
    e.preventDefault()
    win.hide()
  })

}

function createTray() {

  tray = new Tray(path.join(__dirname, "icon.ico"))

  const menu = Menu.buildFromTemplate([
    { label: "显示窗口", click: () => win.show() },
    { label: "退出", click: () => app.exit() }
  ])

  tray.setContextMenu(menu)
}

function pasteText(text) {
  try {
    clipboard.writeText(text)
    // 延迟执行，确保剪贴板已更新且用户有时间切换窗口
    setTimeout(() => {
      exec(`powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^v')"`, (error) => {
        if (error) {
          console.error('粘贴失败:', error.message)
        }
      })
    }, 50)
  } catch (err) {
    console.error('写入剪贴板失败:', err)
  }
}

function startWSServer() {

  const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8080 })

  console.log("WS Server running: 8080")

  wss.on("connection", (ws) => {

    ws.on("message", (data) => {

      const text = data.toString()

      pasteText(text)

    })

  })

}

app.whenReady().then(() => {

  createWindow()
  createTray()

  startWSServer()

})
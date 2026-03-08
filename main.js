const { app, BrowserWindow, Tray, Menu, clipboard, ipcMain } = require("electron")
const WebSocket = require("ws")
const QRCode = require("qrcode")
const { exec } = require("child_process")
const http = require("http")
const fs = require("fs")
const os = require("os")
const path = require("path")

let win
let tray
let clients = new Map() // 存储客户端连接
let clientId = 0

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address
      }
    }
  }
  return "127.0.0.1"
}

function createWindow() {

  win = new BrowserWindow({
    width: 360,
    height: 720,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  })

  win.setMenu(null)
  win.loadFile("index.html")

  win.on("close", (e) => {
    e.preventDefault()
    win.hide()
  })

}

function createTray() {

  tray = new Tray(path.join(__dirname, "icon.ico"))

  const menu = Menu.buildFromTemplate([
    { label: "显示窗口", click: () => { win.show(); win.focus(); } },
    { label: "退出", click: () => app.exit() }
  ])

  tray.setContextMenu(menu)
  
  // 单击托盘图标显示窗口
  tray.on("click", () => {
    win.show()
    win.focus()
  })
}

function pasteText(text, autoEnter = true) {
  //console.log("pasteText 被调用，text:", text, "autoEnter:", autoEnter)
  try {
    clipboard.writeText(text)
    setTimeout(() => {
      let psCmd = `$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^v')`
      if (autoEnter) {
        psCmd += `; Start-Sleep -Milliseconds 50; $wshell.SendKeys('{ENTER}')`
      }
      exec(`powershell -command "${psCmd}"`, (error) => {
        if (error) {
          console.error('粘贴失败:', error.message)
        }
      })
    }, 50)
  } catch (err) {
    console.error('写入剪贴板失败:', err)
  }
}

// 更新客户端列表并通知渲染进程
function updateClients() {
  const clientList = Array.from(clients.values())
  win.webContents.send("clients-update", clientList)
}

function startWSServer() {

  const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8090 })

  console.log("WS Server running: 8090")

  wss.on("connection", (ws, req) => {
    // 获取客户端 IP
    const clientIp = req.socket.remoteAddress.replace(/^::ffff:/, "")
    const id = ++clientId
    
    clients.set(id, { id, ip: clientIp, connectTime: new Date().toLocaleTimeString() })
    updateClients()

    ws.on("message", (data) => {
      const raw = data.toString()
      console.log("收到原始数据:", raw)
      try {
        const msg = JSON.parse(raw)
        console.log("解析结果:", msg)
        pasteText(msg.text, msg.autoEnter)
      } catch (e) {
        console.log("JSON解析失败，使用原始文本:", e.message)
        pasteText(raw, true)
      }
    })

    ws.on("close", () => {
      clients.delete(id)
      updateClients()
    })
  })

}

function startHttpServer() {
  const PORT = 3000
  const websiteDir = path.join(__dirname, "website")

  const server = http.createServer((req, res) => {
    let filePath = path.join(websiteDir, req.url === "/" ? "index.html" : req.url)

    const ext = path.extname(filePath)
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json"
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end("Not Found")
        return
      }
      res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" })
      res.end(data)
    })
  })

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP Server running: http://localhost:${PORT}`)
  })
}

app.whenReady().then(() => {

  ipcMain.handle("get-ip", async () => {
    const ip = getLocalIP()
    const httpUrl = `http://${ip}:3000`
    const qrDataUrl = await QRCode.toDataURL(httpUrl, { width: 200 })
    const clientList = Array.from(clients.values())
    return { ip, httpUrl, qrDataUrl, clients: clientList }
  })

  createWindow()
  createTray()

  startWSServer()
  startHttpServer()

})
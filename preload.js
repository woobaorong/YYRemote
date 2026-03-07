const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {

  setWS(url) {
    ipcRenderer.send("set-ws", url)
  },

  onStatus(cb) {
    ipcRenderer.on("status", (e, msg) => cb(msg))
  }

})
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {

  getIP: () => ipcRenderer.invoke("get-ip"),

  onClientsUpdate: (callback) => {
    ipcRenderer.on("clients-update", (e, clients) => callback(clients))
  }

})
const os = require("os")

function isPrivateLAN(ip) {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4) return false
  
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  return false
}

function isLinkLocal(ip) {
  const parts = ip.split(".").map(Number)
  return parts[0] === 169 && parts[1] === 254
}

function isLoopback(ip) {
  return ip.startsWith("127.")
}

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        const ip = iface.address
        
        console.log(`检查网卡 "${name}": ${ip}`)
        
        if (isLoopback(ip) || isLinkLocal(ip)) {
          console.log(`  -> 跳过 (回环或链路本地地址)`)
          continue
        }

        let priority = 0
        if (isPrivateLAN(ip)) {
          priority = 3
          console.log(`  -> 私有局域网地址，优先级3`)
        } else if (name.toLowerCase().includes("ethernet") || name.toLowerCase().includes("以太网")) {
          priority = 2
          console.log(`  -> 以太网，优先级2`)
        } else if (name.toLowerCase().includes("wi-fi") || name.toLowerCase().includes("wifi") || name.toLowerCase().includes("无线")) {
          priority = 1
          console.log(`  -> WiFi，优先级1`)
        } else {
          console.log(`  -> 其他，优先级0`)
        }
        
        candidates.push({ ip, priority, name })
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority)
    console.log("\n所有候选IP（按优先级排序）:")
    candidates.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.ip} (网卡: ${c.name}, 优先级: ${c.priority})`)
    })
    console.log(`\n最终选择: ${candidates[0].ip}`)
    return candidates[0].ip
  }

  console.log("未找到有效IP，使用127.0.0.1")
  return "127.0.0.1"
}

console.log("=== 测试修复后的IP获取逻辑 ===")
console.log("\n系统所有网络接口信息:")
const allInterfaces = os.networkInterfaces()
for (const name of Object.keys(allInterfaces)) {
  console.log(`\n${name}:`)
  for (const iface of allInterfaces[name]) {
    console.log(`  ${iface.family}: ${iface.address} (internal: ${iface.internal})`)
  }
}

console.log("\n" + "=".repeat(50) + "\n")
getLocalIP()

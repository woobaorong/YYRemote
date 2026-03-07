window.onload = () => {

  const btn = document.getElementById("connect")
  const input = document.getElementById("ws")

  btn.onclick = () => {

    window.api.setWS(input.value)

  }

  window.api.onStatus((msg) => {

    const log = document.getElementById("log")

    log.innerText += msg + "\n"

  })

}
const settings = require('util/settings/settings.js')
const modalMode = require('modalMode.js')
const webviews = require('webviews.js')

let isRecording = false
let recordingMacro = null
let clickListener = null
let keyListener = null

const macroManager = {
  container: document.getElementById('macro-manager'),
  list: document.getElementById('macro-list'),
  nameInput: document.getElementById('macro-name'),
  recordButton: document.getElementById('macro-record'),
  playButton: document.getElementById('macro-play'),
  closeButton: document.getElementById('macro-close'),
  macros: [],
  initialize () {
    macroManager.load()
    macroManager.recordButton.addEventListener('click', () => {
      if (!isRecording) {
        macroManager.startRecording()
      } else {
        macroManager.stopRecording()
      }
    })
    macroManager.playButton.addEventListener('click', () => {
      const name = macroManager.nameInput.value
      const macro = macroManager.macros.find(m => m.name === name)
      if (macro) {
        macroManager.playMacro(macro)
      }
    })
    macroManager.closeButton.addEventListener('click', macroManager.hide)
    document.getElementById('macro-button').addEventListener('click', macroManager.show)
    window.addEventListener('message', function (e) {
      if (e.data === 'showMacroManager') {
        macroManager.show()
      }
    })
    macroManager.renderList()
  },
  load () {
    macroManager.macros = settings.get('macros') || []
  },
  save () {
    settings.set('macros', macroManager.macros)
  },
  show () {
    macroManager.load()
    macroManager.renderList()
    webviews.requestPlaceholder('macroManager')
    modalMode.toggle(true, { onDismiss: macroManager.hide })
    macroManager.container.hidden = false
  },
  hide () {
    macroManager.container.hidden = true
    modalMode.toggle(false)
  },
  renderList () {
    empty(macroManager.list)
    macroManager.macros.forEach(macro => {
      const item = document.createElement('div')
      item.className = 'macro-item'
      const name = document.createElement('span')
      name.textContent = macro.name
      const play = document.createElement('button')
      play.className = 'i carbon:play'
      play.addEventListener('click', () => macroManager.playMacro(macro))
      const del = document.createElement('button')
      del.className = 'i carbon:trash-can'
      del.addEventListener('click', () => {
        macroManager.macros = macroManager.macros.filter(m => m !== macro)
        macroManager.save()
        macroManager.renderList()
      })
      item.appendChild(name)
      item.appendChild(play)
      item.appendChild(del)
      macroManager.list.appendChild(item)
    })
  },
  startRecording () {
    isRecording = true
    recordingMacro = { name: macroManager.nameInput.value || 'macro', actions: [] }
    macroManager.recordButton.textContent = 'Stop'
    clickListener = function (e) {
      recordingMacro.actions.push({ type: 'click', x: e.clientX, y: e.clientY })
    }
    keyListener = function (e) {
      recordingMacro.actions.push({ type: 'keydown', key: e.key })
    }
    document.addEventListener('click', clickListener, true)
    document.addEventListener('keydown', keyListener, true)
  },
  stopRecording () {
    isRecording = false
    document.removeEventListener('click', clickListener, true)
    document.removeEventListener('keydown', keyListener, true)
    macroManager.recordButton.textContent = 'Record'
    macroManager.macros.push(recordingMacro)
    macroManager.save()
    macroManager.renderList()
  },
  playMacro (macro) {
    let delay = 0
    macro.actions.forEach(action => {
      setTimeout(() => {
        if (action.type === 'click') {
          const el = document.elementFromPoint(action.x, action.y)
          if (el) {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          }
        } else if (action.type === 'keydown') {
          const active = document.activeElement
          const evt = new KeyboardEvent('keydown', { key: action.key, bubbles: true })
          active.dispatchEvent(evt)
        }
      }, delay)
      delay += 150
    })
  }
}

module.exports = macroManager

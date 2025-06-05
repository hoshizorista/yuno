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
  stepButton: document.getElementById('macro-step'),
  closeButton: document.getElementById('macro-close'),
  editor: {
    container: document.getElementById('macro-editor'),
    textarea: document.getElementById('macro-editor-content'),
    save: document.getElementById('macro-editor-save'),
    close: document.getElementById('macro-editor-close'),
    macro: null
  },
  stepConsole: {
    container: document.getElementById('macro-step-console'),
    output: document.getElementById('macro-step-output'),
    next: document.getElementById('macro-step-next'),
    stop: document.getElementById('macro-step-stop'),
    close: document.getElementById('macro-step-close'),
    macro: null,
    index: 0
  },
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
    macroManager.stepButton.addEventListener('click', () => {
      const name = macroManager.nameInput.value
      const macro = macroManager.macros.find(m => m.name === name)
      if (macro) {
        macroManager.stepThroughMacro(macro)
      }
    })
    macroManager.editor.save.addEventListener('click', macroManager.saveEditor)
    macroManager.editor.close.addEventListener('click', macroManager.hideEditor)
    macroManager.stepConsole.next.addEventListener('click', () => macroManager.nextStep())
    macroManager.stepConsole.stop.addEventListener('click', macroManager.hideStepConsole)
    macroManager.stepConsole.close.addEventListener('click', macroManager.hideStepConsole)
    window.addEventListener('keydown', function (e) {
      if (!macroManager.stepConsole.container.hidden && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        macroManager.nextStep()
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
      play.title = 'Play'
      play.addEventListener('click', () => macroManager.playMacro(macro))
      const step = document.createElement('button')
      step.className = 'i carbon:chevron-right'
      step.title = 'Step'
      step.addEventListener('click', () => macroManager.stepThroughMacro(macro))
      const edit = document.createElement('button')
      edit.className = 'i carbon:edit'
      edit.title = 'Edit'
      edit.addEventListener('click', () => macroManager.editMacro(macro))
      const del = document.createElement('button')
      del.className = 'i carbon:trash-can'
      del.title = 'Delete'
      del.addEventListener('click', () => {
        macroManager.macros = macroManager.macros.filter(m => m !== macro)
        macroManager.save()
        macroManager.renderList()
      })
      item.appendChild(name)
      item.appendChild(play)
      item.appendChild(step)
      item.appendChild(edit)
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
    if (!recordingMacro.name || recordingMacro.name === 'macro') {
      const name = prompt('Macro name:')
      if (name) {
        recordingMacro.name = name
      }
    }
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
  },
  stepThroughMacro (macro) {
    macroManager.stepConsole.macro = macro
    macroManager.stepConsole.index = 0
    macroManager.stepConsole.container.hidden = false
    macroManager.showStep()
    modalMode.toggle(true, { onDismiss: macroManager.hideStepConsole })
  },
  showStep () {
    const m = macroManager.stepConsole
    if (!m.macro || m.index >= m.macro.actions.length) {
      macroManager.hideStepConsole()
      return
    }
    m.output.textContent = JSON.stringify(m.macro.actions[m.index], null, 2)
  },
  nextStep () {
    const m = macroManager.stepConsole
    if (!m.macro) return
    const action = m.macro.actions[m.index]
    if (action) {
      macroManager.playMacro({ actions: [action] })
      m.index++
      macroManager.showStep()
    } else {
      macroManager.hideStepConsole()
    }
  },
  hideStepConsole () {
    macroManager.stepConsole.container.hidden = true
    modalMode.toggle(false)
    macroManager.stepConsole.macro = null
  },
  editMacro (macro) {
    macroManager.editor.macro = macro
    macroManager.editor.textarea.value = JSON.stringify(macro.actions, null, 2)
    macroManager.editor.container.hidden = false
    modalMode.toggle(true, { onDismiss: macroManager.hideEditor })
  },
  saveEditor () {
    try {
      const actions = JSON.parse(macroManager.editor.textarea.value)
      macroManager.editor.macro.actions = actions
      macroManager.save()
      macroManager.renderList()
      macroManager.hideEditor()
    } catch (e) {
      alert('Invalid JSON')
    }
  },
  hideEditor () {
    macroManager.editor.container.hidden = true
    modalMode.toggle(false)
  }
}

module.exports = macroManager

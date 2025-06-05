const settings = require('util/settings/settings.js')
const modalMode = require('modalMode.js')
const macroManager = require('macroManager.js')

const agentManager = {
  container: document.getElementById('agent-panel'),
  openButton: document.getElementById('agent-button'),
  closeButton: document.getElementById('agent-close'),
  select: document.getElementById('agent-select'),
  addButton: document.getElementById('agent-add'),
  chatLog: document.getElementById('agent-chat-log'),
  messageInput: document.getElementById('agent-message'),
  sendButton: document.getElementById('agent-send'),
  editor: {
    container: document.getElementById('agent-editor'),
    close: document.getElementById('agent-editor-close'),
    save: document.getElementById('agent-editor-save'),
    name: document.getElementById('agent-editor-name'),
    system: document.getElementById('agent-editor-system'),
    provider: document.getElementById('agent-editor-provider'),
    key: document.getElementById('agent-editor-key')
  },
  agents: [],
  chats: {},
  initialize () {
    agentManager.load()
    agentManager.openButton.addEventListener('click', agentManager.show)
    agentManager.closeButton.addEventListener('click', agentManager.hide)
    agentManager.sendButton.addEventListener('click', agentManager.sendMessage)
    agentManager.addButton.addEventListener('click', agentManager.openEditor)
    agentManager.editor.close.addEventListener('click', agentManager.hideEditor)
    agentManager.editor.save.addEventListener('click', agentManager.saveEditor)
    agentManager.renderSelect()
  },
  load () {
    agentManager.agents = settings.get('agents') || []
  },
  save () {
    settings.set('agents', agentManager.agents)
  },
  show () {
    agentManager.load()
    agentManager.renderSelect()
    agentManager.container.hidden = false
    modalMode.toggle(true, { onDismiss: agentManager.hide })
  },
  hide () {
    agentManager.container.hidden = true
    modalMode.toggle(false)
  },
  renderSelect () {
    empty(agentManager.select)
    agentManager.agents.forEach((a, i) => {
      const opt = document.createElement('option')
      opt.value = i
      opt.textContent = a.name
      agentManager.select.appendChild(opt)
    })
  },
  openEditor () {
    agentManager.editor.name.value = ''
    agentManager.editor.system.value = ''
    agentManager.editor.provider.value = 'openai'
    agentManager.editor.key.value = ''
    agentManager.editor.container.hidden = false
    modalMode.toggle(true, { onDismiss: agentManager.hideEditor })
  },
  hideEditor () {
    agentManager.editor.container.hidden = true
    modalMode.toggle(false)
  },
  saveEditor () {
    const a = {
      name: agentManager.editor.name.value,
      system: agentManager.editor.system.value,
      provider: agentManager.editor.provider.value,
      key: agentManager.editor.key.value
    }
    agentManager.agents.push(a)
    agentManager.save()
    agentManager.renderSelect()
    agentManager.hideEditor()
  },
  addMessage (role, text) {
    const div = document.createElement('div')
    div.className = 'msg ' + role
    div.textContent = text
    agentManager.chatLog.appendChild(div)
    agentManager.chatLog.scrollTop = agentManager.chatLog.scrollHeight
  },
  getMacrosContext () {
    return (macroManager.macros || [])
      .map(m => `${m.name}: ${m.description}`)
      .join('\n')
  },
  async sendMessage () {
    const agent = agentManager.agents[agentManager.select.value]
    if (!agent) { return }
    const message = agentManager.messageInput.value
    if (!message) { return }
    agentManager.messageInput.value = ''
    agentManager.addMessage('user', message)
    const history = agentManager.chats[agent.name] || []
    history.push({ role: 'user', content: message })
    const body = await agentManager.callProvider(agent, history)
    if (body) {
      const response = body.content || body
      history.push({ role: 'assistant', content: response })
      agentManager.addMessage('assistant', response)
      agentManager.handleCommands(response)
    }
    agentManager.chats[agent.name] = history
  },
  async callProvider (agent, history) {
    const messages = [
      { role: 'system', content: agent.system + '\n\nKnown Macros:\n' + agentManager.getMacrosContext() },
      ...history
    ]
    try {
      if (agent.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agent.key}`
          },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', messages })
        })
        const json = await res.json()
        return { content: json.choices[0].message.content }
      } else if (agent.provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${agent.key}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: messages.map(m => m.content).join('\n') }] }] })
        })
        const json = await res.json()
        return { content: json.candidates[0].content.parts[0].text }
      } else if (agent.provider === 'ollama' || agent.provider === 'lmstudio') {
        const endpoint = agent.provider === 'ollama' ? 'http://localhost:11434/api/chat' : 'http://localhost:1234/v1/chat/completions'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: agent.key || 'llama2', messages })
        })
        const json = await res.json()
        return { content: json.choices[0].message.content }
      }
    } catch (e) {
      console.error('agent error', e)
      agentManager.addMessage('assistant', 'Error: ' + e.message)
    }
  },
  handleCommands (text) {
    const run = text.match(/\[run_macro:(.*?)\]/)
    if (run && run[1]) {
      const m = (macroManager.macros || []).find(mm => mm.name === run[1])
      if (m) { macroManager.runMacro(m) }
    }
    const create = text.match(/\[create_macro:(.*?)\]/)
    if (create && create[1]) {
      try {
        const data = JSON.parse(create[1])
        macroManager.macros.push(data)
        macroManager.save()
      } catch (e) {
        console.error('macro create failed', e)
      }
    }
  }
}

module.exports = agentManager

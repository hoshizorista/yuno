const settings = require('util/settings/settings.js')
const modalMode = require('modalMode.js')
const webviews = require('webviews.js')
const Sortable = require('sortablejs')
const urlParser = require('util/urlParser.js')

const macroManager = {
  container: document.getElementById('macro-manager'),
  list: document.getElementById('macro-list'),
  createButton: document.getElementById('macro-create'),
  closeButton: document.getElementById('macro-close'),
  editor: {
    container: document.getElementById('macro-editor'),
    name: document.getElementById('macro-editor-name'),
    description: document.getElementById('macro-editor-description'),
    steps: document.getElementById('macro-steps'),
    addStep: document.getElementById('macro-add-step'),
    save: document.getElementById('macro-editor-save'),
    close: document.getElementById('macro-editor-close'),
    macro: null,
    sortable: null
  },
  macros: [],
  initialize () {
    macroManager.load()
    macroManager.createButton.addEventListener('click', () => {
      macroManager.openEditor({ name: '', description: '', steps: [] })
    })
    macroManager.closeButton.addEventListener('click', macroManager.hide)
    macroManager.editor.addStep.addEventListener('click', () => {
      macroManager.addStep()
    })
    macroManager.editor.save.addEventListener('click', macroManager.saveEditor)
    macroManager.editor.close.addEventListener('click', macroManager.hideEditor)
    Sortable.create(macroManager.list)
    macroManager.editor.sortable = Sortable.create(macroManager.editor.steps, {
      handle: '.drag-handle'
    })
    document.getElementById('macro-button').addEventListener('click', macroManager.show)
    window.addEventListener('message', function (e) {
      if (e.data === 'showMacroManager') {
        macroManager.show()
      }
    })
    ipc.on('showMacroManager', macroManager.show)
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
    webviews.hidePlaceholder('macroManager')
  },
  renderList () {
    empty(macroManager.list)
    macroManager.macros.forEach(macro => {
      const item = document.createElement('div')
      item.className = 'macro-item'
      const name = document.createElement('span')
      name.textContent = macro.name
      const run = document.createElement('button')
      run.className = 'i carbon:play'
      run.title = 'Run'
      run.addEventListener('click', () => macroManager.runMacro(macro))
      const edit = document.createElement('button')
      edit.className = 'i carbon:edit'
      edit.title = 'Edit'
      edit.addEventListener('click', () => macroManager.openEditor(macro))
      const del = document.createElement('button')
      del.className = 'i carbon:trash-can'
      del.title = 'Delete'
      del.addEventListener('click', () => {
        macroManager.macros = macroManager.macros.filter(m => m !== macro)
        macroManager.save()
        macroManager.renderList()
      })
      item.appendChild(name)
      item.appendChild(run)
      item.appendChild(edit)
      item.appendChild(del)
      macroManager.list.appendChild(item)
    })
  },
  openEditor (macro) {
    macroManager.editor.macro = macro
    macroManager.editor.name.value = macro.name
    macroManager.editor.description.value = macro.description || ''
    empty(macroManager.editor.steps)
    macro.steps.forEach(step => macroManager.addStep(step))
    macroManager.editor.container.hidden = false
    modalMode.toggle(true, { onDismiss: macroManager.hideEditor })
  },
  hideEditor () {
    macroManager.editor.container.hidden = true
    modalMode.toggle(false)
    macroManager.editor.macro = null
  },
  pickSelector (input) {
    const id = tabs.getSelected()
const script = `(function(){return new Promise(r=>{const o=document.createElement('div');o.style.position='fixed';o.style.top=0;o.style.left=0;o.style.right=0;o.style.bottom=0;o.style.zIndex=2147483647;o.style.cursor='crosshair';o.style.background='rgba(0,0,0,0.05)';const h=document.createElement('div');h.style.position='absolute';h.style.border='2px solid red';o.appendChild(h);function d(x,y){o.style.display='none';const el=document.elementFromPoint(x,y);o.style.display='';return el;}function m(e){const t=d(e.clientX,e.clientY);if(!t)return;const b=t.getBoundingClientRect();h.style.top=b.top+'px';h.style.left=b.left+'px';h.style.width=b.width+'px';h.style.height=b.height+'px';}function s(e){e.preventDefault();e.stopPropagation();document.removeEventListener('mousemove',m,true);document.removeEventListener('click',s,true);const el=d(e.clientX,e.clientY);o.remove();r(g(el));}function g(el){if(el.id)return '#'+el.id;const p=[];while(el&&el.nodeType===1&&el!==document.body){let t=el.nodeName.toLowerCase();let sib=el,n=1;while(sib.previousElementSibling){sib=sib.previousElementSibling;if(sib.nodeName===el.nodeName)n++;}if(n>1)t+=':nth-of-type('+n+')';p.unshift(t);el=el.parentElement;}return p.join(' > ');}document.addEventListener('mousemove',m,true);document.addEventListener('click',s,true);document.body.appendChild(o);});})()`


    // temporarily allow interaction with the page so the user can pick an element
    webviews.hidePlaceholder('macroManager')
    modalMode.toggle(false)
    macroManager.container.hidden = true

    webviews.callAsync(id, 'executeJavaScript', script, function (err, selector) {
      // restore modal UI once selection is finished
      macroManager.container.hidden = false
      modalMode.toggle(true, { onDismiss: macroManager.hide })
      webviews.requestPlaceholder('macroManager')

      if (!err && selector) {
        input.value = selector
      }
    })
  },
  addStep (step = { type: 'navigate' }) {
    const row = document.createElement('div')
    row.className = 'macro-step'
    row.draggable = true
    const drag = document.createElement('span')
    drag.textContent = '\u2630'
    drag.className = 'drag-handle'
    const type = document.createElement('select')
    ;['navigate', 'click', 'input', 'sleep', 'wait', 'wait_for_selector', 'press_key', 'scroll', 'screenshot', 'run_js'].forEach(t => {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = t
      if (step.type === t) opt.selected = true
      type.appendChild(opt)
    })
    const p1 = document.createElement('input')
    p1.className = 'param1'
    const p2 = document.createElement('input')
    p2.className = 'param2'
    const text = document.createElement('textarea')
    text.className = 'paramText'
    const pick = document.createElement('button')
    pick.textContent = 'Select'
    pick.addEventListener('click', () => macroManager.pickSelector(p1))
    const remove = document.createElement('button')
    remove.textContent = '✕'
    remove.addEventListener('click', () => row.remove())
    function updateVisibility () {
      p1.type = 'text'
      p2.type = 'text'
      text.style.display = 'none'
      p1.placeholder = ''
      p2.placeholder = ''
      p1.value = step.param1 || ''
      p2.value = step.param2 || ''
      text.value = step.script || ''
      if (type.value === 'navigate') {
        p1.placeholder = 'URL'
        p2.style.display = 'none'
        pick.style.display = 'none'
      } else if (type.value === 'click') {
        p1.placeholder = 'Selector'
        p2.style.display = 'none'
        pick.style.display = 'inline-block'
      } else if (type.value === 'input') {
        p1.placeholder = 'Selector'
        p2.placeholder = 'Text'
        p2.style.display = 'inline-block'
        pick.style.display = 'inline-block'
      } else if (type.value === 'sleep' || type.value === 'wait') {
        p1.placeholder = 'ms'
        p2.style.display = 'none'
        pick.style.display = 'none'
      } else if (type.value === 'wait_for_selector') {
        p1.placeholder = 'Selector'
        p2.placeholder = 'Timeout ms'
        p2.style.display = 'inline-block'
        pick.style.display = 'inline-block'
      } else if (type.value === 'press_key') {
        p1.placeholder = 'Key'
        p2.style.display = 'none'
        pick.style.display = 'none'
      } else if (type.value === 'scroll') {
        p1.placeholder = 'Selector or x,y'
        p2.style.display = 'none'
        pick.style.display = 'inline-block'
      } else if (type.value === 'screenshot') {
        p1.placeholder = 'File name'
        p2.style.display = 'none'
        pick.style.display = 'none'
      } else if (type.value === 'run_js') {
        p1.style.display = 'none'
        p2.style.display = 'none'
        text.style.display = 'block'
        pick.style.display = 'none'
      }
    }
    type.addEventListener('change', updateVisibility)
    updateVisibility()
    row.appendChild(drag)
    row.appendChild(type)
    row.appendChild(p1)
    row.appendChild(pick)
    row.appendChild(p2)
    row.appendChild(text)
    row.appendChild(remove)
    macroManager.editor.steps.appendChild(row)
  },
  getStepFromRow (row) {
    const type = row.querySelector('select').value
    const step = { type }
    if (type === 'run_js') {
      step.script = row.querySelector('.paramText').value
    } else if (type === 'input') {
      step.selector = row.querySelector('.param1').value
      step.text = row.querySelector('.param2').value
    } else if (type === 'navigate') {
      step.url = row.querySelector('.param1').value
    } else if (type === 'click') {
      step.selector = row.querySelector('.param1').value
    } else if (type === 'sleep' || type === 'wait') {
      step.duration = parseInt(row.querySelector('.param1').value) || 0
    } else if (type === 'wait_for_selector') {
      step.selector = row.querySelector('.param1').value
      step.timeout = parseInt(row.querySelector('.param2').value) || 0
    } else if (type === 'press_key') {
      step.key = row.querySelector('.param1').value
    } else if (type === 'scroll') {
      step.target = row.querySelector('.param1').value
    } else if (type === 'screenshot') {
      step.file = row.querySelector('.param1').value
    }
    return step
  },
  saveEditor () {
    const steps = Array.from(macroManager.editor.steps.children).map(row => macroManager.getStepFromRow(row))
    macroManager.editor.macro.name = macroManager.editor.name.value
    macroManager.editor.macro.description = macroManager.editor.description.value
    macroManager.editor.macro.steps = steps
    if (!macroManager.macros.includes(macroManager.editor.macro)) {
      macroManager.macros.push(macroManager.editor.macro)
    }
    macroManager.save()
    macroManager.renderList()
    macroManager.hideEditor()
  },
  runMacro (macro) {
    async function executeStep (step) {
      const id = tabs.getSelected()
      if (step.type === 'navigate') {
        ipc.send('loadURLInView', { id, url: urlParser.parse(step.url) })
      } else if (step.type === 'click') {
        const script = `document.querySelector(${JSON.stringify(step.selector)}).click()`
        webviews.callAsync(id, 'executeJavaScript', script)
      } else if (step.type === 'input') {
        const script = `var el=document.querySelector(${JSON.stringify(step.selector)});if(el){el.focus();el.value=${JSON.stringify(step.text)}}`
        webviews.callAsync(id, 'executeJavaScript', script)
      } else if (step.type === 'sleep' || step.type === 'wait') {
        await new Promise(resolve => setTimeout(resolve, step.duration))
      } else if (step.type === 'wait_for_selector') {
        await new Promise(resolve => {
          const script = `(
            function(){
              var sel=${JSON.stringify(step.selector)};
              var timeout=${step.timeout || 10000};
              return new Promise(res=>{
                var start=Date.now();
                (function check(){
                  if(document.querySelector(sel)){res(true);return;}
                  if(Date.now()-start>=timeout){res(false);return;}
                  setTimeout(check,100);
                })();
              });
            })()`
          webviews.callAsync(id, 'executeJavaScript', script, () => resolve())
        })
      } else if (step.type === 'press_key') {
        const script = `(
          function(){
            var e=new KeyboardEvent('keydown',{key:${JSON.stringify(step.key)}});
            document.activeElement.dispatchEvent(e);
            e=new KeyboardEvent('keyup',{key:${JSON.stringify(step.key)}});
            document.activeElement.dispatchEvent(e);
          })()`
        webviews.callAsync(id, 'executeJavaScript', script)
      } else if (step.type === 'scroll') {
        const s = step.target
        const script = `
          (function(){
            if(document.querySelector(${JSON.stringify(s)})){
              document.querySelector(${JSON.stringify(s)}).scrollIntoView()
            } else {
              var coords=${JSON.stringify(s)}.split(',');
              if(coords.length===2){window.scrollTo(parseInt(coords[0]),parseInt(coords[1]))}
            }
          })()
        `
        webviews.callAsync(id, 'executeJavaScript', script)
      } else if (step.type === 'screenshot') {
        ipc.send('saveViewCapture', { id })
      } else if (step.type === 'run_js') {
        webviews.callAsync(id, 'executeJavaScript', step.script)
      }
    }
    ;(async () => {
      for (const step of macro.steps) {
        try {
          await executeStep(step)
        } catch (e) {
          console.warn('Macro step failed', e)
          break
        }
      }
    })()
  }
}

module.exports = macroManager

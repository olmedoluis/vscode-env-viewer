const { basename } = require('path')
const vscode = require('vscode')
const { parse } = require('dotenv')

class EnvironmentHandler {
  constructor() {
    this.panel = null
    this.file = null
    this.lines = []
    this.template = {}
    this.modes = {}
    this.values = {}
  }

  setPanel(panel, context) {
    this.panel = panel

    panel.webview.onDidReceiveMessage(
      handleDidReceiveMessage,
      undefined,
      context.subscriptions
    )

    panel.onDidDispose(() => (this.panel = null), null, context.subscriptions)
  }

  setFile(file) {
    const fileContent = file.document.getText()
    const jumpLine = jumplines[process.platform] || jumplines.default

    this.file = file
    this.lines = fileContent.split(jumpLine)

    this.readEnvironment()
  }

  readEnvironment() {
    const parsedLines = getValuesArray(this.lines)

    parsedLines[envKeys.ENV_MODE] = formatGroupLines(
      parsedLines[envKeys.ENV_MODE] || []
    )

    parsedLines[envKeys.ENV_VALUE] = formatGroupLines(
      parsedLines[envKeys.ENV_VALUE] || []
    )

    this.template = parseEnvTemplate(parsedLines[envKeys.ENV_TEMPLATE])
    this.modes = parseEnvModes(parsedLines[envKeys.ENV_MODE])
    this.values = parseEnvValues(parsedLines[envKeys.ENV_VALUE])
  }

  updateEnvironment({ envType, envKey, scope, value }) {
    switch (envType) {
      case envKeys.ENV_VALUE:
        this.template[envKey] = value
        break

      case envKeys.ENV_MODE:
        this.template = { ...this.template, ...this.modes[scope][value] }
        break
    }

    const templateIndex =
      this.lines.findIndex((line) => line.includes('// @env-template')) + 1

    this.file
      .edit((editBuilder) => {
        Object.keys(this.template).forEach((key, index) => {
          const line = this.file.document.lineAt(templateIndex + index).text

          const linePosition = new vscode.Position(templateIndex + index, 0)
          const linePositionEnd = new vscode.Position(
            templateIndex + index,
            line.length
          )

          const value = this.template[key]

          editBuilder.replace(
            new vscode.Range(linePosition, linePositionEnd),
            `${key}=${value}`
          )
        })
      })
      .then(() => {
        this.file.document.save().then(() => this.updatePanel())

        this.setFile(this.file)
      })
  }

  updatePanel() {
    this.panel.webview.html = getWebviewContent()
  }

  handleOnExternalSave(file) {
    const isSameFile = this.file.document.uri.path === file.uri.path

    if (isSameFile) {
      this.setFile(this.file)
      this.updatePanel()
    }
  }
}

const environment = new EnvironmentHandler()

const envKeys = {
  ENV_TEMPLATE: 'env-template',
  ENV_MODE: 'env-mode',
  ENV_VALUE: 'env-value',
}

const jumplines = {
  win32: '\r\n',
  default: '\n',
}

const eventKeys = {
  CHANGED_VALUE: 'env-viewer.changedValueEvent',
  OPEN_PREVIEW: 'env-viewer.openPreviewToTheSide',
}

function handleDidReceiveMessage(message) {
  switch (message.command) {
    case eventKeys.CHANGED_VALUE:
      environment.updateEnvironment(message.data)
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const interpretateCommand = vscode.commands.registerCommand(
    eventKeys.OPEN_PREVIEW,
    function openPreview() {
      environment.setFile(vscode.window.activeTextEditor)

      if (!environment.panel) {
        const panel = vscode.window.createWebviewPanel(
          'editor',
          basename(vscode.window.activeTextEditor.document.fileName),
          vscode.ViewColumn.Two,
          { enableScripts: true }
        )

        environment.setPanel(panel, context)
        environment.updatePanel()
      } else {
        environment.panel.reveal(2)
      }
    }
  )

  const didSaveTextEvent = vscode.workspace.onDidSaveTextDocument((file) =>
    environment.handleOnExternalSave(file)
  )

  context.subscriptions.push(interpretateCommand, didSaveTextEvent)
}

module.exports = {
  activate,
}

function getValuesArray(lines = []) {
  let key = envKeys.ENV_TEMPLATE

  return lines.reduce((sectionedLines, line) => {
    const hasNewKey = line.includes('// @')

    if (hasNewKey) {
      const newKey = Object.values(envKeys).find((envKey) =>
        line.includes(envKey)
      )

      key = newKey || key
    }

    const oldLines = sectionedLines[key] || []

    return { ...sectionedLines, [key]: [...oldLines, line] }
  }, {})
}

function formatGroupLines(lines) {
  let carriedLines = []

  const formattedLines = lines.reduce((sectionedLines, line) => {
    const hasNewKey = line.includes('// @')

    if (hasNewKey) {
      sectionedLines = carriedLines.length
        ? [...sectionedLines, carriedLines]
        : sectionedLines

      carriedLines = [line]
    } else {
      carriedLines = [...carriedLines, line]
    }

    return sectionedLines
  }, [])

  return carriedLines.length
    ? [...formattedLines, carriedLines]
    : formattedLines
}

const parseEnvTemplate = (lines) => {
  const values = lines.slice(1)
  const valuesInLine = values.join(jumplines[process.platform])

  return parse(valuesInLine)
}

const parseEnvModes = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, ...values] = lines
    const valuesInLine = values
      .map((value) => value.replace('//', ''))
      .join(jumplines[process.platform])

    const cuttedMetadata = metadata.match(/\/\/ @env-mode:(\w+)\.(\w+)/)

    if (!cuttedMetadata) {
      vscode.window.showErrorMessage(
        `Error: Env tag wrong typed \"${metadata}\"`
      )

      return envModes
    }

    const [scope, key] = cuttedMetadata.slice(1)

    const carriedScopes = envModes[scope] || {}

    return {
      ...envModes,
      [scope]: { ...carriedScopes, [key]: parse(valuesInLine) },
    }
  }, {})
}

const parseEnvValues = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, valuesInLine] = lines
    const values = valuesInLine.replace('//', '').split(',')

    const cuttedMetadata = metadata.match(/\/\/ @env-value:(\w+)/)

    if (!cuttedMetadata) {
      vscode.window.showErrorMessage(
        `Error: Env tag wrong typed \"${metadata}\"`
      )

      return envModes
    }

    const [key] = cuttedMetadata.slice(1)

    return { ...envModes, [key]: values.map((value) => value.trim()) }
  }, {})
}

const getEventFunction = ({ envType, envKey = null, scope = null }) => {
  return `
  (function() {
    const value = event.target.value
    const envType = '${envType}'
    const envKey = '${envKey}'
    const scope = '${scope}'

    vscode.postMessage({
      command: '${eventKeys.CHANGED_VALUE}',
      data: { envType, envKey, scope, value }
    })
  }())
  `
}

function checkModeSelected(allValues, mode) {
  return Object.keys(mode).every((key) => mode[key] === allValues[key])
}

const getDefaultOption = (value = 'Custom') => {
  return `<option selected disabled>${value}</option>`
}

function getWebviewContent() {
  const { template, modes, values } = environment

  const envTemplateHTML = Object.keys(template).map((envKey) => {
    const value = template[envKey]
    const formattedValue = `${envKey}:`
    const hasInputSelect = values.hasOwnProperty(envKey)

    const eventData = { envType: envKeys.ENV_VALUE, envKey }
    const handleOnChange = getEventFunction(eventData)
    const commonProps = `onChange="${handleOnChange}" class="input"`

    let selectOptions = []
    let customRow = ''

    if (hasInputSelect) {
      const hasSelectedOptions = values[envKey].some(
        (option) => value === option
      )

      selectOptions = values[envKey].map((option) => {
        const isSelected = value === option
        const selection = isSelected ? 'selected' : ''

        return `<option ${selection} value="${option}">${option}</option>`
      })

      selectOptions = !hasSelectedOptions
        ? [...selectOptions, getDefaultOption(value)]
        : selectOptions

      customRow = !hasSelectedOptions ? `class="custom"` : ''
    }

    const input = !hasInputSelect
      ? `<input type="text" ${commonProps} value="${value}"/>`
      : `<select ${commonProps}>${selectOptions.join()}</select>`

    return `
		<tr>
				<td>${formattedValue}</td>
				<td ${customRow}>${input}</td>
		</tr>
		`
  })

  const envModesHTML = Object.keys(modes).map((envKey) => {
    const values = modes[envKey]
    const formattedValue = `${envKey}:`

    const hasSelectedOptions = Object.keys(values).some((option) =>
      checkModeSelected(template, values[option])
    )
    let options = Object.keys(values).map((option) => {
      const value = values[option]
      const isSelected = checkModeSelected(template, value)
      const selection = isSelected ? 'selected' : ''

      return `<option ${selection} value="${option}">${option}</option>`
    })
    options = !hasSelectedOptions ? [...options, getDefaultOption()] : options

    const eventData = { envType: envKeys.ENV_MODE, scope: envKey }
    const handleOnChange = getEventFunction(eventData)

    const customRow = !hasSelectedOptions ? `class="custom"` : ''

    return `
		<tr>
				<td>${formattedValue}</td>
				<td ${customRow} ><select class="input" onChange="${handleOnChange}">${options.join()}</select></td>
		</tr>
		`
  })

  const hasModes = Boolean(Object.keys(modes).length)
  const hasValues = Boolean(Object.keys(template).length)

  const modesTable = hasModes
    ? `
    <h2 class="sub-title">Modes</h2>
    <hr />

    <table class="table">
        <tr>
            <th>MODE</th>
            <th>VALUE</th>
        </tr>
        ${envModesHTML.join('')}
    </table>
  `
    : ''

  const valuesTable = hasValues
    ? `
    <h2 class="sub-title">Values</h2>
    <hr />
    
    <table class="table">
        <tr>
            <th>VARIABLE</th>
            <th>VALUE</th>
        </tr>
        ${envTemplateHTML.join('')}
    </table>
  `
    : ''

  return `
	<!DOCTYPE html>

	<html lang="en">
	<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getStyles()}</style>
			<title>Env Editor</title>
	</head>
	<body>
			<h1 class="title">Environment Editor</h1>

      ${modesTable}

      ${valuesTable}

      <hr/>
      <footer><a href="https://github.com/olmedoluis/vscode-env-viewer">vscode-env-viewer</a></footer>

      <script>
        const vscode = acquireVsCodeApi();
      </script>
	</body>
	</html>
	`
}

function getStyles() {
  return `
    body,
    input,
    select {
      font-family: var(--vscode-editor-font-family);
    }

    .title {
      text-align: center;
    }

    .sub-title {
      margin: 0 0 10px;
    }

    .table,
    .input {
      width: 100%;
    }

    .table {
      margin-bottom: 30px;
    }

    .table td {
      width: 50vw;
      word-break: break-word;
    }

    .table td:last-child {
      padding-left: 10px;
      background: var(--vscode-gitDecoration-ignoredResourceForeground);
      border-radius: 3px;
    }
    
    .table td.custom:last-child {
      background: var(--vscode-gitDecoration-modifiedResourceForeground);
    }
    
    .input {
      box-sizing: border-box;
      border: none;
      border-radius: 3px;
      padding: 4px 5px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
    }

    select.input {
      padding: 4px 1px;
    }

    .input:focus{
      outline: none;
    }
    
    .table tr:focus-within,
    .table tr:focus-within input {
      color: var(--vscode-menu-selectionForeground);
    }

    footer {
      padding: 50px 0;
    }

    footer a {
      display: block;
      text-align: center;
    }
  `
}

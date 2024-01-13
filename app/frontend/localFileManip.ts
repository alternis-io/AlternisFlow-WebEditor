/** options for downloading a file that is created locally with some given string content */
interface DownloadFileOptsLocal {
  fileName?: string
  appendEstimatedFileExtension?: boolean
  content: string
}

type DownloadFileOpts = DownloadFileOptsLocal

const makeBlobUrl = (
  data: string,
) => {
  const blob = new Blob([data]);
  return URL.createObjectURL(blob);
}

const mimetypeToExtensionMap: { [k: string]: string } = {
  'text/csv': 'csv',
  'application/zip': 'zip',
}

export const downloadFile = async (opts: DownloadFileOpts) => {
  const a = document.createElement('a')
  a.style.display = 'none'
  let contentType: string | undefined
  a.href = makeBlobUrl(opts.content)
  if (opts.fileName) a.download = opts.fileName
  if (opts.appendEstimatedFileExtension && contentType) {
    a.download = `${a.download}.${mimetypeToExtensionMap[contentType] || 'txt'}`
  }
  document.body.append(a)
  a.click()
  a.remove()
}

/** prompt the user to upload a file, currenlty only supports text */
export const uploadFile = async (opts: { type: 'text' | 'dataurl' }) => {
  const result = await new Promise<{ name: string; content: string }>(
    (resolve, reject) => {
      // should probably just keep this available at all times
      const hiddenTree = document.createElement('div')
      hiddenTree.style.display = 'none'
      hiddenTree.innerHTML = `<input type="file" id="temp-upload" />`
      const input = hiddenTree.children[0] as HTMLInputElement
      input.onchange = function() {
        try {
          if (input.files === null) throw Error("No files in input")
          const file = input.files.item(0)
          if (file === null) throw Error("First file in input was null")
          const blob = file
          const reader = new FileReader()
          reader.onloadend = function(ev) {
            if (ev.target?.readyState === FileReader.DONE) {
              resolve({ name: file.name, content: ev.target.result as string })
            }
          }
          if (opts.type === 'text') {
            reader.readAsText(blob, 'utf8')
          } else {
            reader.readAsDataURL(blob)
          }
        } catch (err) {
          reject(err)
        }
      }
      input.click()
    }
  )
  return result
}

export default downloadFile

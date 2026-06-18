/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSONBIN_BIN_ID?: string
  readonly VITE_JSONBIN_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="@app-types/gapi" />
/// <reference types="@app-types/gapi.client" />
/// <reference types="@app-types/google.accounts" />

declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}

export {};
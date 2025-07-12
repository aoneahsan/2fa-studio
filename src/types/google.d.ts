/// <reference types="@types/gapi" />
/// <reference types="@types/gapi.client" />
/// <reference types="@types/google.accounts" />

declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}

export {};
# Catholic Core

An exploratory web app for reading the *Catechism of the Catholic Church* as a graph.

## What it does

- vendors the official Vatican English HTML corpus into the repository
- builds a paragraph graph from structured paragraph pages and internal cross-references
- computes PageRank across the paragraph network
- renders a zoomable visual explorer
- provides dedicated paragraph pages with footnotes and inbound/outbound links

## Local development

```bash
npm install
npm run build:data
npm run dev
```

## Build

```bash
npm run build
```

The derived graph data is written to `public/data/catechism-graph.json`.

## Android

The Android app is a native Kotlin WebView shell around the bundled reader. It works offline and keeps the last paragraph, language, contents-panel state, expanded contents branches, and citation-panel width in WebView local storage.

Open the `android/` directory in Android Studio, or build from the repository root:

```bash
npm run android:build
```

`npm run android:assets` rebuilds the web app and copies it into the Android asset bundle without compiling an APK.

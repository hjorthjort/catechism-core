# Catholic Core for iPhone and iPad

The Apple app is a SwiftUI shell around the repository's existing reader. It uses `WKWebView` for the shared reading experience and packages `dist/client` at build time. No web content, fonts, or catechism data are duplicated in source control.

## Run locally

1. Install an [App Store Connect-supported Xcode version](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds) from the Mac App Store and open `CatholicCore.xcodeproj`.
2. Select the **CatholicCore** scheme and an iPhone or iPad simulator.
3. Press **Run**. The build phase runs the root `npm run build` and embeds the result for offline use.

Node.js and the repository's npm dependencies must be installed. From the repository root, run `npm install` if needed. If Xcode cannot find Node, launch Xcode from a shell with `open ios/CatholicCore.xcodeproj`, or set a full Node path in the build script environment.

## Prepare App Store Connect

You need a paid Apple Developer Program membership, a unique bundle identifier, App Store Connect access, and an Apple distribution agreement with tax/banking information completed if the app will be paid or use purchases.

1. In Xcode, select the app target, then **Signing & Capabilities**.
2. Choose your Apple Developer team and replace `se.catholiccore.reader` if that identifier is not yours.
3. Keep **Automatically manage signing** enabled unless your organization manages profiles manually.
4. In App Store Connect, [create a new iOS app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app) using the exact bundle identifier. Do this before the first upload. The SKU is an internal value such as `catholic-core-ios`.
5. Fill in the app name, subtitle, description, category, age rating, copyright, support URL, and privacy-policy URL.
6. Supply iPhone and iPad screenshots from supported simulator sizes. The project already contains the required 1024×1024 App Store icon, but review it before release.
7. Complete [App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy) accurately and provide the required privacy-policy URL. The app currently has no analytics, ads, accounts, or native tracking; revisit the answers whenever that changes. External links can still take users to third-party sites.

## TestFlight

1. Increment `MARKETING_VERSION` for a public version and `CURRENT_PROJECT_VERSION` for every upload.
2. Select **Any iOS Device (arm64)**, then **Product → Archive**.
3. In Organizer choose **Distribute App → App Store Connect → Upload**.
4. Wait for processing in App Store Connect, add the build to an internal TestFlight group, and test offline launch, paragraph navigation, English/Swedish content, links, sharing, rotation, Dynamic Type, VoiceOver, and iPad layouts.
5. For external testers, create a group, add beta review notes and contact details, then submit the build for Beta App Review.

## App Store release

Attach the tested build to the App Store version, complete export-compliance questions, add review contact information and useful review notes, then [add and submit the version for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app). Choose manual, automatic, or phased release. After approval, monitor crashes, reviews, and accessibility feedback before expanding functionality.

Before the first submission, replace the placeholder share domain in `ReaderWebView.swift` with the deployed reader URL if `https://catholiccore.app/` is not the production address. Also verify that distribution rights and attribution for the catechism corpus, Bible text, and bundled fonts cover App Store distribution.

Apple may scrutinize apps that feel like repackaged websites under guideline 4.2. In review notes, explain the offline corpus, iPhone/iPad adaptation, native sharing, system link handling, state restoration, accessibility, and privacy behavior. Continue moving features that benefit from platform integration—such as bookmarks, reading progress, Spotlight search, widgets, and Shortcuts—into Swift as the product develops.

const TEAM_ID = 'F7P3MSVVWS'
const BUNDLE_ID = 'com.fis.installer'

export const appleAppSiteAssociation = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: `${TEAM_ID}.${BUNDLE_ID}`,
        paths: [
          '/verify-email*',
          '/setup-password*',
          '/create-account*',
          '/installer/*',
        ],
      },
    ],
  },
}

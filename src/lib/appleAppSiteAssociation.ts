const TEAM_ID = 'F7P3MSVVWS'
const BUNDLE_ID = 'com.fis.installer'
const APP_ID = `${TEAM_ID}.${BUNDLE_ID}`

export const appleAppSiteAssociation = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: APP_ID,
        appIDs: [APP_ID],
        paths: [
          '/verify-email*',
          '/setup-password*',
          '/create-account*',
          '/installer/*',
        ],
        components: [
          { '/': '/verify-email*' },
          { '/': '/setup-password*' },
          { '/': '/create-account*' },
          { '/': '/installer/*' },
        ],
      },
    ],
  },
}

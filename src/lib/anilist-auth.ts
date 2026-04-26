const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize'
const TOKEN_KEY = 'weebsync_token'

export const buildAuthUrl = (clientId: string): string => {
    const parameters = new URLSearchParams({
        client_id: clientId,
        response_type: 'token',
    })
    return `${ANILIST_AUTH_URL}?${parameters.toString()}`
}

export const parseTokenFromHash = (hash: string): null | string => {
    const parameters = new URLSearchParams(hash.replace(/^#/, ''))
    return parameters.get('access_token')
}

export const storeToken = (token: string): void => {
    sessionStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): null | string => sessionStorage.getItem(TOKEN_KEY)

export const clearToken = (): void => {
    sessionStorage.removeItem(TOKEN_KEY)
}

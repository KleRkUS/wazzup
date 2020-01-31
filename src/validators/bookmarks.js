export const bookmarkLinkConstraints = {
  presence: true,
  url: {
    schemes: [".+"],
    message: {
      code: "BOOKMARKS_INVALID_LINK",
      description: "Link invalid"
    }
  },
  exclusion: {
    within: {
      "http://yahoo.com": "Yahoo",
      "https://yahoo.com": "Yahoo",
      "http://socket.io": "Socket.io", 
      "https://socket.io": "Socket.io",
    },
    message: {
      code: "BOOKMARKS_BLOCKED_DOMAIN",
      description: "Link is banned"
    }
  }
}

export const bookmarkLinkType = {
  description: {
    type: {
      type: "string",
      message: "Description is invalid"
    }
  },
  favorites: {
    type: {
      type: "boolean",
      message: "Favorites is invalid"
    }
  }

}
const uuid = require('uuid/v4'); // ES5

'use strict';

module.exports = (sequelize, DataTypes) => {
  var bookmarks = sequelize.define('bookmarks', {
    guid: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: uuid()
    },
    link: {
      type: DataTypes.STRING(256),
      defaultValue: "",
      allowNull: false
    },
    createdAt: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    favorites: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  });

  return bookmarks;
};
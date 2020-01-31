import { Router } from 'express';
import request from 'request';
import jwt from "jsonwebtoken";
import validate from 'validate.js';
import mustache from "mustache";

import models from '../../models';
import http from "../../../config/http";
import { bookmarkLinkConstraints } from '../../validators/bookmarks';

const router = Router(),
      defaultQueryParams = {
        limit: 50,
        offset: 0,
        sort_by: "createdAt",
        sort_dir: "asc"
      };

/**
 * @api {get} [dev-]backend.wazzup24.com/api/v1/bookmarks Get bookmarks
 * @apiDescription Получение всех закладок в соответствии с запросом
 * @apiVersion 1.0.0
 * @apiName Bookmarks
 * @apiGroup Bookmarks
 * @apiPermission all
 *
 * @apiParam false
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *   {
 *      "length": 987, // Всего записей с указанным фильтром в БД (внимание, всего - это без учета лимита пагинации)
 *      "data": [
 *        {
 *          "guid": '97f10d85-5d2f-4450-a0c4-307e8e9a991f',
 *          "link": 'https://ya.ru',
 *          "createdAt": 1547459442106,
 *          "description": 'Тот самый Яндекс',
 *          "favorites": false
 *        },
 *      ...
 *      ]
 *   }
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 400 Bad Request
 *   {
 *     "errors": {
 *        "bookmarks": [
 *          "No bookmark found with this query!" 
 *        ],
 *        "backend": [
 *          "Bad order request!",
 *          "Can't get bookmarks"
 *        ]
 *     }
 *   }
**/

router.get("/", async (req, res) => {

  let explodedRequestQuery = explodeRequestQuery(req.query),
      queryParams = explodedRequestQuery.query,
      whereClause = explodedRequestQuery.where;

  queryParams = Object.assign(defaultQueryParams, queryParams);

  try {

    const data = await models.bookmarks.findAll({
            where: whereClause,
            order: [[queryParams['sort_by'], queryParams['sort_dir']]],
            offset: queryParams.offset,
            limit: queryParams.limit
          }),
          amount = await models.bookmarks.count({
            where: whereClause
          }),
          result = {
            length: amount,
            data: data
          };

    if (amount == 0) {
      res.status(401).json({ errors: { bookmarks: "No bookmark found with this query!" }});
    }

    if (!data && amount != 0) {
      res.status(400).json({errors: {backend: "Bad order request!"}});
    }

    res.status(200).json(result);
  
  } catch(error) {
    console.log(error);
    res.status(400).json({
      errors: {
        backend: ["Can't get bookmarks"]
      }
    });
  }

});


/**
 * @api {post} [dev-]backend.wazzup24.com/api/v1/bookmarks Create bookmarks
 * @apiDescription Создание новой закладки
 * @apiVersion 1.0.0
 * @apiName Bookmarks
 * @apiGroup Bookmarks
 * @apiPermission all
 *
 * @apiParam {String} link Ссылка для закладки (в формате "https://domain.com" или "http://domain.com")
 * @apiParam {String} description Описание закладки (по умолчанию - пустая строка)
 * @apiParam {Boolean} favorites Отметить закладку как избранное (по умолчанию false)
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *   {
 *      "data": {
 *          "guid": '97f10d85-5d2f-4450-a0c4-307e8e9a991f',
 *          "createdAt": 1547459442106,
 *        }
 *   }
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 400 Bad Request
 *   {
 *     "errors": {
 *        "validation": [
 *           {
 *              code: "BOOKMARKS_BLOCKED_DOMAIN",
 *              description: "Link is banned!"
 *           },
 *           {
 *              code: "BOOKMARKS_INVALID_LINK",
 *              description: "Link invalid!"
 *           }
 *        ],
 *        "backend": [
 *          "Can't create bookmarks"
 *        ]
 *     }
 *   }
**/


router.post("/", async (req, res) => {

    const validationResult = validate(req.body, {
      link: bookmarkLinkConstraints
    });

    if (validationResult) {

      res.status(400).json({
        errors: {
          validation: validationResult.link[0],
        }
      });
      return 0;

    } else {
      try {

        const favorites = req.body.favorites || false,
              description = req.body.description || "";

        let query = await models.bookmarks.create({
          link: req.body.link,
          description: description,
          favorites: favorites,
          createdAt: + Date.now()
        });

        if (!query) {
          res.status(400).json({
            errors: {
              backend: "Can't create bookmark!"
            }
          });
        } else {   
          res.status(200).json({
            data: {
              guid: query.guid,
              createdAt: query.createdAt
            }
          });
        }  

      } catch(error) {
        console.log(error);
        res.status(400).json({
          errors: {
            backend: "Can't create bookmark!"
          }
        });
      }
    }

});


/**
 * @api {patch} [dev-]backend.wazzup24.com/api/v1/bookmarks Update bookmark
 * @apiDescription Изменение закладки
 * @apiVersion 1.0.0
 * @apiName Bookmarks
 * @apiGroup Bookmarks
 * @apiPermission all
 *
 * @apiParam {String} guid UUID закладки
 * @apiParam {String} link Ссылка закладки (не обязательный параметр)
 * @apiParam {String} description Описание закладки (не обязательный параметр)
 * @apiParam {Boolean} favorites Отметить закладку как избранное (не обязательный параметр)
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *   {
 *      "data": "OK"
 *   }
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 400 Bad Request
 *   {
 *     "errors": {
 *        "validation": [
 *           {
 *              code: "BOOKMARKS_BLOCKED_DOMAIN",
 *              description: "Link is banned!"
 *           },
 *           {
 *              code: "BOOKMARKS_INVALID_LINK",
 *              description: "Link invalid!"
 *           }
 *        ],
 *        "backend": [
 *          "Can't create bookmarks"
 *        ]
 *     }
 *   }
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 404 Bad Request
 *   {
 *     "errors": {
 *        "bookmarks": { 
 *          "404 Bookmark not found with guid ${guid}"
 *        } 
 *     }
 *   }
 *
**/

router.patch("/:guid", async (req, res) => {

  const check = chechGuidExistence(req.params.guid);

  if (!check) {
    res.status(404).json({
      errors: {
        bookmarks: "404 Bookmark not found with UUID = " + req.params.guid
      }
    });
  }

  if (req.body.link)  {
    const validationResult = validate(req.body, {
      link: bookmarkLinkConstraints
    });

    if (validationResult) {

      res.status(400).json({
        errors: {
          validation: validationResult.link[0],
        }
      });
      return 0;
    }
  }

  try {

    let query = await models.bookmarks.update(
      req.body,
      {where: {guid: req.params.guid}}
    );

    if (!query) {
      res.status(400).json({
        backend: "Can't patch bookmark!"
      });
    } else {
      res.status(200).json({
        data: "OK"
      });
    }

    } catch(error) {
        console.log(error);
        res.status(400).json({
          errors: {
            backend: "Can't patch bookmark!"
          }
        });
    }

});


/**
 * @api {delete} [dev-]backend.wazzup24.com/api/v1/bookmarks Delete bookmark
 * @apiDescription Удаление закладки
 * @apiVersion 1.0.0
 * @apiName Bookmarks
 * @apiGroup Bookmarks
 * @apiPermission all
 *
 * @apiParam {String} guid UUID закладки
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *   {
 *      "data": "OK"
 *   }
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 400 Bad Request
 *   {
 *     "errors": {
 *        "backend": [
 *          "Can't create bookmarks"
 *        ]
 *     }
 *   }
 *
 *  @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1 404 Bad Request
 *   {
 *     "errors": {
 *        "bookmarks": { 
 *          "404 Bookmark not found with guid ${guid}"
 *        } 
 *     }
 *   }
**/


router.delete("/:guid", async (req, res) => {

  const checkGuid = chechGuidExistence(req.params.guid);

  if (!checkGuid) {
    res.status(404).json({
      errors: {
        bookmarks: "404 Bookmark not found with guid " + req.params.guid
      }
    });
    return 0;
  }

  try {

    let query = await models.bookmarks.destroy({
      where: {
        guid: req.params.guid
      }
    })

    if (!query) {
      res.status(400).json({
        errors: {
          backend: "Can't delete boorkmark!"
        }
      });
    } else {
      res.status(200).json({
        data: "OK"
      });
    }

  } catch(error) {
        console.log(error);
        res.status(400).json({
          errors: {
            backend: "Can't delete bookmark!"
          }
        });
    }

});
     

/**
 * 
 * @functionName Explode Request Query 
 * @functionDescription Разбить запрос на Where Clause и Order
 * 
 * @param {object} obj Тело запроса
 *
 * @return {object} {query: парамерты запроса, where: параметры для where clause}
 * 
**/

function explodeRequestQuery(obj) {
  let queryParams = {},
      whereClause = {};

  for (let [key, param] of Object.entries(obj)) {

    if (defaultQueryParams.hasOwnProperty(key)) {

      queryParams[key] = param;

    } else {

      whereClause[key] = param;

    }

    return {query: queryParams, where: whereClause}

  }
}

/**
 * 
 * @functionName Chech Guid Existence 
 * @functionDescription Проверка существования закладкси с заданным guid
 * 
 * @param {string} guid  
 *
 * @return {boolean}
 * 
**/

async function chechGuidExistence(guid) {

  await models.bookmarks.count({
    where: {
      guid: guid
    }
  }).then(count => {
    if (count == 0) {
      return false;
    } else {
      return true;
    }
  });

}

export default router;
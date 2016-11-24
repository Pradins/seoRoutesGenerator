module.exports = {
    username: 'root',
    password: '0ndh0-2004',
    host: '128.199.53.150',
    port: 22,
    dstHost: '172.17.0.6',
    dstPort: 27017,
    localHost: '127.0.0.1',
    localPort: 27000,
    dbName: 'mycook',
    staticRoutes: true,
    shardValue: 'FI-MYCOOKWITT',
    models: [
        {
            model: "Recipe",
            searchQuery: {region: "FI-MYCOOKWITT","grants.view": "public"},
            identificator: "niceName",
            routePath: "/recipe",
            source: "db"
        },
        {
            model: "Categories",
            searchQuery: {region: "FI-MYCOOKWITT"},
            identificator: "niceName",
            routePath: "/recipes",
            source: "db"
        },
        {
            model: "Recipe",
            searchQuery: [{$match:{"region":"FI-MYCOOKWITT"}},{$group:{"_id":"$user.niceName","count":{"$sum":1}}},{$match:{"_id":{$ne: null},"count":{"$gt": 10}}}],
            identificator: "_id",
            routePath: "/author",
            source: "dbAggegation"
        },
        {
            routePath: "/tags",
            source: "api",
            endpoint: "http://fi-mycookwitt.group-taurus.com/tags"
        }
    ]
};

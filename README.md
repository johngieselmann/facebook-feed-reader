# Facebook Feed Reader

This is a PHP and JavaScript Facebook feed reader utilizing the Facebook
graph API via their JavaScript SDK. The JavaScript class reads the page feed
data objects returned from the Twitter API and builds an HTML string for each
of them.

## Requirements

- Facebook app authorized to read the targeted page.
- jQuery v1.10.2+ - For the JavaScript class.

## Setup

Replace the access token in `php/ffr_token.php` file with the your app's
token.
```
$accessToken = "xxxxxxxxxxxxxxxxxxxxxx";
```

Include the CSS files in your HTML.
```
<link type="text/css" rel="stylesheet" href="css/reset.css" />
<link type="text/css" rel="stylesheet" href="css/ffr.main.css" />
```

Include the JavaScript files in your HTML.
```
<script type="text/javascript" src="/js/jquery.js"></script>
<script type="text/javascript" src="/js/ffr.main.js"></script>
```

Instantiate the `FacebookFeedReader` class in your JavaScript and initialize
it with your configuration.
```
// create the connector configuration, this mirrors the default
var ffrConfig = {
    "appId"      : null,
    "onComplete" : function(posts, postsHtml) {},
    "pageId"     : null,
    "tokenPath"  : "php/ffr_token.php"
};

// instantiate and initialize, on init, the posts will be requesting
var ffr = new window.FacebookFeedReader();
ffr.init(ffrConfig);
```

# JavaScript Configuration

The configuration for the class. These can (and should be) be changed with
initialization.

- **appId** str *(default: null)* The Facebook App ID that grants access
  to pulling the feed.

- **onComplete** func *(default: empty)* The function called once the
  building of the post HTML is complete.
  - *Param 1* arr - An array of the posts pulled.
  - *Param 2* arr - An array of the HTML built for each post.

- **pageId** str *(default: null)* The ID of the Facebook page/person for
  which we are pulling the feed.

- **tokenPath** str *(default: php/ffr_token.php)* The path to the file
  that will return the Facebook Access Token.


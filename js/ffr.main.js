/**
 * Facebook Feed Reader is a simple feed reader for facebook pages.
 *
 * @author JohnG <john.gieselmann@gmail.com>
 *
 * @requirements
 * - A Facebook App
 * - <div id="fb-root"></div> inserted in the page
 * - jQuery v1.11.0+
 *
 * @version 0.1
 */
(function(window, document, $, undefined) {

    /**
     * The class to handle the actually functionality.
     *
     * @author JohnG <john.gieselmann@gmail.com>
     */
    function FacebookFeedReader() {

        // retain scope
        var self = this;

        /**
         * The configuration of the class.
         *
         * - appId str (default: null) The Facebook App ID that grants access
         *   to pulling the feed.
         *
         * - onComplete func (default: empty) The function called once the
         *   building of the post HTML is complete.
         *   - Param 1 arr - An array of the posts pulled.
         *   - Param 2 arr - An array of the HTML built for each post.
         *
         * - pageId str (default: null) The ID of the Facebook page/person for
         *   which we are pulling the feed.
         *
         * - postLimit int (default: false) The maximum number of posts to
         *   create from the page.
         *
         * - tokenPath str (default: php/ffr_token.php) The path to the file
         *   that will return the Facebook Access Token.
         */
        this.config = {
            "appId"      : null,
            "onComplete" : function(posts, postsHtml) {},
            "pageId"     : null,
            "postLimit"  : false,
            "tokenPath"  : "php/ffr_token.php"
        };

        /**
         * The templates for the various types of views.
         * @var obj templates
         */
        this.dom = {

            // the html for the types of posts
            "status" : {
                "el"   : "p",
                "attr" : {
                    "class" : "ffr-status"
                }
            },

            "link" : {
                "el"   : "a",
                "attr" : {
                    "class"  : "ffr-link",
                    "href"   : "<%link-href%>",
                    "target" : "_blank"
                }
            },

            "photo" : {
                "el" : "p",
                "attr" : {
                    "class" : "ffr-media"
                },
                "children" : [
                    "img"
                ]
            },

            "img" : {
                "el"   : "img",
                "attr" : {
                    "class" : "ffr-img js-ffr-img",
                    "src"   : "<%photo-src%>",
                    "alt"   : "<%photo-alt%>"
                }
            },

            // the full twitter element
            "container" : {
                "el"       : "div",
                "attr"     : {
                    "class" : "ffr-container"
                },
                "children" : [
                    "head",
                    "status",
                    "actions"
                ]
            },
            "head" : {
                "el"       : "div",
                "attr"     : {
                    "class" : "ffr-header clear"
                },
                "children" : [
                    "icon",
                    "date"
                ]
            },
            "icon" : {
                "el"   : "div",
                "attr" : {
                    "class"  : "ffr-icon"
                },
                "children" : [
                    "iconLink"
                ]
            },
            "iconLink" : {
                "el"   : "a",
                "attr" : {
                    "class" : "ffr-fa fa-facebook",
                    "href"   : "http://facebook.com/<%page-id%>",
                    "target" : "_blank"
                }
            },
            "date" : {
                "el"   : "div",
                "attr" : {
                    "class" : "ffr-date"
                }
            },
            "actions": {
                "el"   : "div",
                "attr" : {
                    "class" : "ffr-actions"
                }
            }
        };

        /**
         * The array of post objects.
         * @var arr posts
         */
        this.posts = [];

        /**
         * The html for each post.
         * @var arr postsHtml
         */
        this.postsHtml = [];

        /**
         * The photo object for the posts. The key is the post id.
         * @var obj postsPhotos
         */
        this.postsPhotos = {};

        /**
         * The total count of photo posts so we can track the asynchronous
         * requests pulling the photo sources.
         * @var int postsPhotosCount
         */
        this.postsPhotosCount = 0;

        /**
         * The running count of photos pulled for tracking progress and
         * updating the photo sources.
         * @var int postsPhotosProgress
         */
        this.postsPhotosProgress = 0;

        /**
         * Keep track of the interval checking if photos are done being pulled.
         * @var int postsPhotosInterval
         */
        this.postsPhotosInterval = null;

        /**
         * Initialize the class.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         */
        this.init = function(options) {

            // assign the options to the config
            options = options || {};
            for (var i in options) {
                self.config[i] = options[i];
            }

            // get out if there is no app ID
            if (!self.config.appId) {
                self.throwError("No app ID identified, exiting.");
                return false;
            }

            // Facebook JS SDK
            window.fbAsyncInit = function() {
                FB.init({
                    appId      : self.config.appId,
                    status     : true,
                    xfbml      : false
                });

                // we have been initialized, let's grab those posts
                self.getPosts();
            };

            (function(d, s, id){
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {return;}
                js = d.createElement(s); js.id = id;
                js.src = "//connect.facebook.net/en_US/all.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
            // end JS SDK

        };

        this.getAccessToken = function() {
            var token = null;

            // get the access token from an inaccessible location
            $.ajax({
                async   : false,
                url     : self.config.tokenPath,
                success : function(result) {
                    token = result;
                }
            });

            return token;
        };

        /**
         * Get the feed from the targeted page.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @return void
         */
        this.getPosts = function() {

            // the access token
            var token = self.getAccessToken();

            if (!token) {
                self.throwError("No Access Token.");
                return false;
            }

            FB.api(
                "/" + self.config.pageId + "/feed",
                "get",
                {
                    "access_token" : token
                },
                self.getFeedSuccess
            );
        };

        /**
         * Set the post properties after successfully getting the posts.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param str result The result from pulling the posts formatted
         * as JSON.
         *
         * @return void
         */
        this.getFeedSuccess = function(result) {

            // if there was an error, throw an error and stop
            if (result.error) {
                self.throwError(result.error.message);
                return false;
            }

            // set the posts object and the HTML for the posts
            var postCount = 0;
            for (var i = 0; i < result.data.length; i++) {
                self.posts[i] = result.data[i];

                // ignore facebook status updates
                if (   self.posts[i].type === "status"
                    && typeof self.posts[i].message === "undefined"
                ) {
                    continue;
                }

                // do not go beyond our post limit if it is set
                if (self.config.postLimit !== false) {
                    if (postCount >= parseInt(self.config.postLimit)) {
                        break;
                    }
                }

                self.postsHtml[i] = self.buildPost(self.posts[i]);
                postCount++;
            }

            // call the onComplete callback
            if (typeof self.config.onComplete === "function") {
                self.config.onComplete(self.posts, self.postsHtml);

                // start checking if photos are ready for updating now
                self.getPhotos();
                setTimeout(function() {
                    self.postsPhotosInterval = setInterval(self.updatePhotos, 500);
                }, 1000);
            }
        };

        /**
         * Build out the HTML for the post to account for the entities.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param obj post The post object from which to build the HTML.
         *
         * @return str postEl The full HTML element for the post and its
         * container.
         */
        this.buildPost = function(post) {

            // build the post html
            var postHtml = post.message.replace(
                self.getReplaceKey(post),
                self.buildEntity(post)
            );

            // replace any line breaks
            postHtml = postHtml.replace(/\n/g, "<br />");

            // now wrap the post in its container
            var postEl = self.buildElement(
                "container",
                {
                    "content-status" : postHtml,
                    "content-date"   : self.buildDate(post),
                    "page-id"        : self.config.pageId
                }
            );

            return postEl;
        };

        /**
         * Build an HTML element from the dom template property. This is
         * built to be called recursively in order to add in the children
         * of the element as well.
         *
         * @param str domKey The key to get the right dom template.
         *
         * @param obj replace An object of keys and the values to replace
         * them with. The key should be a str, but will be replacing the
         * <%key%> placeholders in any dom element with the corresponding
         * value.
         *
         * The "content-<domKey>" key in the object is reserved for placing
         * content specific to the currently rendered element. This key is
         * in place because of recursive calling and needing to know when
         * to insert content and where. If "content" is not defined in
         * the dom object, the content is rendered before the children.
         *
         * @return str tag The completed tag.
         */
        this.buildElement = function(domKey, replace) {

            // get the dom template
            var dom = self.dom[domKey];

            // set some default values to prevent errors
            replace = replace || {};
            var contentPos = typeof dom.content !== "undefined"
                ? dom.content
                : "before";

            // open the tag
            var tag = "<" + dom.el;

            for (var attr in dom.attr) {
                var attrVal = dom.attr[attr];

                // replace any values in the attributes that were passed
                // in
                for (var key in replace) {

                    // skip over the content replacements
                    if (key.match(/^content-/)) {
                        continue;
                    }

                    var placeholder = "<%" + key + "%>";
                    if (attrVal.match(placeholder)) {
                        attrVal = attrVal.replace(placeholder, replace[key]);
                    }
                }

                // now set the attribute and its value
                tag += " " + attr + "='" + attrVal + "'";
            }
            tag += ">";

            // insert the content before the children if there is anything
            // to be inserted and this element should have it before the
            // the children
            if (   typeof replace["content-" + domKey] !== "undefined"
                && contentPos === "before"
            ) {
                tag += replace["content-" + domKey];
            }

            // add in any children by recursively calling this function
            if (typeof dom.children !== "undefined") {
                for (var childKey in dom.children) {
                    var child = dom.children[childKey];

                    // build the child element with the original replace
                    // object, hopefully everything has been passed in that
                    // is needed
                    var childEl = self.buildElement(child, replace);
                    tag += childEl;

                }
            }

            // insert the content after the children if there is anything
            // to be inserted and this element should have it before the
            // the children
            if (   typeof replace["content-" + domKey] !== "undefined"
                && contentPos === "after"
            ) {
                tag += replace["content-" + domKey];
            }

            // close the tag
            tag += "</" + dom.el + ">";
            return tag;
        };

        /** 
         * Set the replacement key for an entity. This is the text we will
         * be replacing with html to make thinks like functional links.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param obj data The data associated with the post.
         *
         * @return str key The replacement key.
         */
        this.getReplaceKey = function(data) {
            switch (data.type) {

                case "link":
                    var key = data.link;
                    break;

                case "photo":
                    var key = new RegExp(/$/);
                    break;

                // nothing to replace, use a non-sensical string
                case "status":
                default:
                    var key = "dfu23jn2EONC02dsv92DLADFJSD21jhtoi";
            }

            return key;
        };

        /**
         * Build the function HTML entity for the post.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param obj data The post object.
         *
         * @return str el The HTML element.
         */
        this.buildEntity = function(data) {
            switch (data.type) {
                case "hashtags":
                    var el = self.buildElement(
                        data.type,
                        {
                            "hashText"           : data.text,
                            "content-symbolWrap" : "#",
                            "content-linkText"   : data.text
                        }
                    );
                    break;

                case "link":
                    var el = self.buildElement(
                        data.type,
                        {
                            "content-link" : data.link,
                            "link-href"    : data.link
                        }
                    );
                    break;

                case "photo":
                    var el = self.buildElement(
                        data.type,
                        {
                            "photo-src" : data.picture,
                            "photo-alt" : data.id
                        }
                    );
                    break;

                case "status":
                default:
                    var el = data.message;
                    break;
            }

            return el;
        };

        /**
         * Create a readable date format.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param obj data The post data.
         *
         * @return str dateStr The date string inserted into the post HTML.
         */
        this.buildDate = function(data) {

            // separate the date and time
            var exp = data.created_time.split("T");
            var dateExp = exp[0].split("-");

            var dateStr = dateExp[1] + "." + dateExp[2] + "." + dateExp[0];
            return dateStr;
        };

        /**
         * Get all the uploaded photos.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         */
        this.getPhotos = function() {
            FB.api(
                "/" + self.config.pageId + "/photos/uploaded",
                "get",
                {
                    "access_token" : self.getAccessToken()
                },
                function(result) {
                    // loop through all the uploads and pull the data for
                    // each individual photo
                    if (!result.error) {
                        for (var i in result.data) {
                            self.getPhoto(result.data[i].id);
                            self.postsPhotosCount++;
                        }
                    }
                }
            );
        };

        /**
         * Get a photo by its ID.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param int id The photo id.
         *
         * @return str src
         */
        this.getPhoto = function(id) {

            // get the photos for a post id
            FB.api(
                "/" + id,
                "get",
                {
                    "access_token" : self.getAccessToken()
                },
                function(result) {
                    // increment the progress of photos
                    self.postsPhotosProgress++;

                    if (!result.error) {
//                        self.postsPhotos[data.id] = result.data[0];
                        self.postsPhotos[result.id] = result.source;
                    }
                }
            );
        };

        /**
         * Checks if we have all the photos, then updates the sources of each
         * assuming we have them all.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @return void
         */
        this.updatePhotos = function() {

            // the total photos and the number retrieved match, kill the
            // interval and update the photos
            if (self.postsPhotosCount === self.postsPhotosProgress) {

                // stop checking if we are ready to update
                clearInterval(self.postsPhotosInterval);
                self.postsPhotosInterval = null;

                // go through all the pulled photos and update their img tags
                $(".js-ffr-img").each(function() {
                    var $img = $(this);
                    var src = $img.attr("src");

                    for (var postId in self.postsPhotos) {

                        var re = new RegExp(postId);
                        if (src.match(re)) {
                            $img.attr("src", self.postsPhotos[postId]);
                            delete self.postsPhotos[postId];
                        }
                    }
                });
            }
        };

        /**
         * Our fake error throwing that really just logs things to the console.
         *
         * @author JohnG <john.gieselmann@gmail.com>
         *
         * @param str msg The message to send to the log.
         *
         * @return void
         */
        this.throwError = function(msg) {
            console.log("ERROR - Simple Facebook Connector Error:", msg);
        }
    }

    // assign the class to the window
    window.FacebookFeedReader = FacebookFeedReader;

    // END Facebook JS SDK

}(window, document, jQuery, undefined));

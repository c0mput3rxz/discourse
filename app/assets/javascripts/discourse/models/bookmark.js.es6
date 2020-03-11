import Category from "discourse/models/category";
import { longDate } from "discourse/lib/formatter";
import PreloadStore from "preload-store";
import { none } from "@ember/object/computed";
import { computed } from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import { Promise } from "rsvp";
import RestModel from "discourse/models/rest";
import discourseComputed from "discourse-common/utils/decorators";

const Bookmark = RestModel.extend({
  newBookmark: none("id"),

  @computed
  get url() {
    return Discourse.getURL(`/bookmarks/${this.id}`);
  },

  destroy() {
    if (this.newBookmark) return Promise.resolve();

    return ajax(this.url, {
      type: "DELETE"
    });
  },

  @discourseComputed("highest_post_number", "url")
  lastPostUrl(highestPostNumber) {
    return this.urlForPostNumber(highestPostNumber);
  },

  // Helper to build a Url with a post number
  urlForPostNumber(postNumber) {
    let url = Discourse.getURL(`/t/${this.topic_id}`);
    if (postNumber && postNumber > 0) {
      url += `/${postNumber}`;
    }
    return url;
  },

  // returns createdAt if there's no bumped date
  @discourseComputed("bumped_at", "createdAt")
  bumpedAt(bumped_at, createdAt) {
    if (bumped_at) {
      return new Date(bumped_at);
    } else {
      return createdAt;
    }
  },

  @discourseComputed("bumpedAt", "createdAt")
  bumpedAtTitle(bumpedAt, createdAt) {
    const firstPost = I18n.t("first_post");
    const lastPost = I18n.t("last_post");
    const createdAtDate = longDate(createdAt);
    const bumpedAtDate = longDate(bumpedAt);

    return `${firstPost}: ${createdAtDate}\n${lastPost}: ${bumpedAtDate}`;
  },

  @discourseComputed("created_at")
  createdAt(created_at) {
    return new Date(created_at);
  },

  @discourseComputed("tags")
  visibleListTags(tags) {
    if (!tags || !this.siteSettings.suppress_overlapping_tags_in_list) {
      return tags;
    }

    const title = this.title;
    const newTags = [];

    tags.forEach(function(tag) {
      if (title.toLowerCase().indexOf(tag) === -1) {
        newTags.push(tag);
      }
    });

    return newTags;
  },

  @discourseComputed("category_id")
  category(categoryId) {
    return Category.findById(categoryId);
  },

  @discourseComputed("bookmark_reminder_at")
  formattedReminder(bookmarkReminderAt) {
    const currentUser = PreloadStore.get("currentUser");
    return moment
      .tz(bookmarkReminderAt, currentUser.timezone || moment.tz.guess())
      .format(I18n.t("dates.long_with_year"));
  },

  loadItems() {
    return ajax(`/u/${this.user.username}/bookmarks.json`, { cache: "false" });
  }
});

Bookmark.reopenClass({
  create(args) {
    args = args || {};
    args.siteSettings = args.siteSettings || Discourse.SiteSettings;
    return this._super(args);
  }
});

export default Bookmark;

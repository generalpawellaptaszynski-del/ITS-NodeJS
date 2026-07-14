if (window.jQuery) {
  $.ajaxSetup({
    beforeSend: function (xhr, settings) {
      var method = String(settings && settings.type ? settings.type : "GET").toUpperCase();
      var token = window.ITS_AUTH_TOKEN || "";
      var url = String(settings && settings.url ? settings.url : "");

      if (token && !/^(GET|HEAD|OPTIONS)$/.test(method) && !/^https?:\/\//i.test(url)) {
        xhr.setRequestHeader("x-its-auth-token", token);
      }
    }
  });
}

/* On startup */
$(document).ready(function(){
  updateSiteHeaderTitles();
  initExpandableNav();
//  // Read the Service Key from the file
//  $("#ServiceKey").load("/ServiceKey");
//  
//  // Change the ServiceKey
//  $('#fileServiceKey').on('change', function(){
//    var location = window.location.pathname;
//    var formData = new FormData($("#frmKeyUpload")[0]);
//    $.ajax({
//      url: '/tt/upload/key',
//      type: 'POST',
//      data: formData,
//      mimeType: "multipart/form-data",
//      contentType: false,
//      cache: false,
//      processData: false,
//      success: function (data, textStatus, jqXHR) {
//        window.location.pathname = location;
//      },
//      error: function (jqXHR, textStatus, errorThrown) {}
//    });
//  });
});

function updateSiteGroupTitle() {
  updateSiteHeaderTitles();
}

$(document).on("click", "nav .dropdown-content a, nav .dropbtn", function () {
  updateSiteHeaderTitles();
});

function initExpandableNav() {
  var $nav = $("nav.site-nav");
  if (!$nav.length) {
    return;
  }

  openCurrentNavDropdown($nav);
  markCurrentNavSelection($nav);

  $nav.on("click", ".dropdown > .dropbtn", function (e) {
    e.preventDefault();

    var $button = $(this);
    var $dropdown = $button.closest(".dropdown");
    var willOpen = !$dropdown.hasClass("open");

    $nav.find(".dropdown.open")
      .not($dropdown)
      .removeClass("open")
      .children(".dropbtn")
      .attr("aria-expanded", "false");

    $dropdown.toggleClass("open", willOpen);
    $button.attr("aria-expanded", willOpen ? "true" : "false");
  });

  $nav.on("click", ".dropdown-content a", function () {
    openCurrentNavDropdown($nav);
  });
}

function updateSiteHeaderTitles() {
  var titles = resolveSiteTitles(window.location.pathname);
  if (titles.group) {
    $("#site-brand-group").text(titles.group);
  }
  if (titles.item) {
    $("#site-brand-item").text(titles.item);
  }
}

function resolveSiteTitles(pathname) {
  var groupTitle = normalizeSiteGroupTitle(window.SITE_GROUP_TITLE && window.SITE_GROUP_TITLE[pathname]);
  var itemTitle = "";

  var $link = findBestMatchingNavLink(pathname);

  if ($link && $link.length) {
    if (!groupTitle) {
      groupTitle = normalizeSiteGroupTitle($link.data("site-group"));
    }
    itemTitle = normalizeSiteItemTitle($link.text());
  }

  if (!groupTitle && $link && $link.length) {
    groupTitle = normalizeSiteGroupTitle($link.closest(".dropdown").data("site-group"));
  }

  return {
    group: groupTitle || "",
    item: itemTitle || ""
  };
}

function openCurrentNavDropdown($nav) {
  var $link = findBestMatchingNavLink(window.location.pathname);
  if (!$link.length) {
    return;
  }

  var $dropdown = $link.closest(".dropdown");
  if (!$dropdown.length) {
    return;
  }

  $nav.find(".dropdown.open")
    .removeClass("open")
    .children(".dropbtn")
    .attr("aria-expanded", "false");

  $dropdown.addClass("open");
  $dropdown.children(".dropbtn").attr("aria-expanded", "true");
  markCurrentNavSelection($nav);
}

function markCurrentNavSelection($nav) {
  var $link = findBestMatchingNavLink(window.location.pathname);

  $nav.find(".dropdown.current").removeClass("current");
  $nav.find(".dropdown-content a.active")
    .removeClass("active")
    .removeAttr("aria-current");

  if (!$link.length) {
    return;
  }

  $link.addClass("active").attr("aria-current", "page");
  $link.closest(".dropdown").addClass("current");
}

function findBestMatchingNavLink(pathname) {
  var $link = $();
  $("nav .dropdown-content a[href]").each(function () {
    var href = $(this).attr("href") || "";
    if (!href) {
      return;
    }

    if (pathname === href || pathname.indexOf(href + "/") === 0) {
      if (!$link.length || href.length > ($link.attr("href") || "").length) {
        $link = $(this);
      }
    }
  });

  return $link;
}

function normalizeSiteGroupTitle(title) {
  if (!title) {
    return "";
  }

  var normalized = String(title).trim();
  var lookup = {
    "HR": "HR",
    "Production": "PRODUCTION",
    "PRODUCTION": "PRODUCTION",
    "Time Tracking": "TIME TRACKING",
    "TIME TRACKING": "TIME TRACKING",
    "Warehouse": "WAREHOUSE",
    "WAREHOUSE": "WAREHOUSE",
    "Tiem Tarcking System": "TIME TRACKING",
    "Time Tracking System": "TIME TRACKING"
  };

  return lookup[normalized] || normalized.toUpperCase();
}

function normalizeSiteItemTitle(title) {
  if (!title) {
    return "";
  }

  return String(title).trim().toUpperCase();
}

function handleError(message) {
  alert("Error: " + message);
}

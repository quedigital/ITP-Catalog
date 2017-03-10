$(function () {

	var data_url = "https://firebasestorage.googleapis.com/v0/b/itp-catalog.appspot.com/o/catalog.txt?alt=media&token=f5fda839-9798-48b3-a963-0086848930f0";

	var keyword_classes = ["keyword-1", "keyword-2", "keyword-3", "keyword-4", "keyword-5"];

	var keywords = [];
	var items = [];

	var toggleOn = false;

	var admin = false;

	var savedKeywords = [];

	function configureFirebase () {
		var config = {
			apiKey: 'AIzaSyBZUAltnRHEK5FU0Tj7iS8Ro22HjkhVijM',
			authDomain: 'itp-catalog.firebaseapp.com',
			databaseURL: '<your-database-url>',
			storageBucket: 'gs://itp-catalog.appspot.com'
		};

		firebase.initializeApp(config);
	}

	function onDataLoaded (tsv) {
		parseText(tsv);
		addKeywordButtons();
		addTitles();
		initializeCatalog();

		$("#download-button").click(function () {
			updateDownloadList();
			$("#downloadLink")[0].click();
		});

		$("#toggle-all").click(onClickToggleAll);

		$("#pearson-logo").click(onClickLogo);

		$("#filter-pane").affix({offset: {top: $("#catalog-row").offset().top} });

		$("#filter-pane").on("affix.bs.affix", function () {
			var w = $("#filter-outer").width();
			$("#filter-pane").outerWidth(w);
		});

		$("#filter-pane").on("affix-top.bs.affix", function () {
			$("#filter-pane").width("auto");
		});

		$("#add-keyword-button").click(onClickAddKeyword);

		$("#sort-buttons .btn").on("click", onClickSort);
		$('#view-buttons').on('click', '.btn', onClickView);

		$("#update-catalog").click(onClickUpdateCatalog);

		$(window).resize(onResize);

		setAdmin(false);

		onResize();
	}

	function onResize () {
		$("#filter-pane").data("bs.affix").options.offset = $("#catalog-row").offset().top;

		restrictFilterPane();
	}

	function restrictFilterPane () {
		var w = $("#filter-outer").width();
		$("#filter-pane").css("max-width", w);
	}

	function trimString (k) {
		if (k.charAt(0) == "\"") {
			k = k.substr(1);
		}
		if (k.charAt(k.length - 1) == "\"") {
			k = k.substr(0, k.length - 1);
		}

		k = k.trim();

		return k;
	}

	function toDate (d) {
		return new Date(d);
	}

	function toPrice (s) {
		return parseFloat(s.substr(1));
	}

	function sortCaseInsensitive (a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	}

	function parseText (tsv) {
		var i = 0, n = 0;
		tsv += "\r";    // make sure there's a carriage return at the end

		while (i != -1 && n < 10000) {
			var j = tsv.indexOf("\r", i + 1);
			if (j != -1 && n > 0 && (j - i > 2)) {
				var line = tsv.substr(i, j - i);
				var row = line.split("\t");
				var key = trimString(row[9]);
				var keys = key.split(",");
				for (var k = 0; k < keys.length; k++) {
					var thisKey = trimString(keys[k]);
					if (thisKey != "" && keywords.indexOf(thisKey) == -1) {
						keywords.push(thisKey);
					}
				}

				var item = {
					isbn10: trimString(row[0]),
					isbn: trimString(row[1]),
					title: trimString(row[2]),
					author: trimString(row[3]),
					discountCode: trimString(row[5]),
					instock: row[6],
					date: toDate(row[6]),
					price: row[7],
					keywords: key,
					duration: row[4],
					editor: trimString(row[8]),
					show: row[10] == "hide" ? "hide" : ""
				};

				if (item.title)
					items.push(item);
			}
			n++;
			i = j;
		}

		keywords = keywords.sort(sortCaseInsensitive);
	}

	function addKeywordButtons () {
		for (var i = 0; i < keywords.length; i++) {
			var key = keywords[i];
			addKeywordButton(key);
		}
	}

	function addKeywordButton (keyword, checked) {
		if (checked == undefined) checked = true;

		var btn = $("<label>", {class: "btn btn-primary keyword-btn " + (checked ? "active" : ""), "data-keywords": keyword });
		var input = $("<input>", {type: "checkbox"}).prop("checked", checked);
		var span = $("<span>", {class: "glyphicon glyphicon-ok"});

		var n = $("#keyword-buttons .btn").length;

		btn.addClass(keyword_classes[n % keyword_classes.length]);
		var lbl = $("<span>", { text: " " + keyword });
		btn.append(lbl);
		btn.append(input);
		btn.prepend(span);
		$("#keyword-buttons").append(btn);

		btn.on("change", onClickKeyword);
	}

	function addTitles () {
		var container = $(".isotope");

		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			var el = $("<div>", {
				class: "catalog-item",
				"data-isbn": item.isbn,
				"data-title": item.title,
				"data-author": item.author,
				"data-keywords": item.keywords,
				"data-price": toPrice(item.price),
				"data-date": item.date.getTime(),
				"data-show": item.show,
				"data-duration": item.duration,
				"data-index": i
			});

			var show = item.show != "hide";

			var showOrHide = $("<input>", {class: "show-or-hide", type: "checkbox"}).prop("checked", show);
			showOrHide.change(onClickShowHide);
			el.append(showOrHide);

			if (!show)
				el.addClass("hidden-item");

			var coverHolder = $("<div>", { class: "cover-holder" });

			var h = $("<h3>");
			var a = $("<a>", { class: "title", text: item.title, href: "http://www.informit.com/title/" + item.isbn, target: "_blank" });
			a.click(onClickLink);
			h.append(a);
			var div = $("<div>", { class: "cover"} );
			var img = $("<img>", { src: "https://www.informit.com/ShowCover.aspx?isbn=" + item.isbn + "&type=f" } );
			img.on("load", function () { relayoutCatalog(); });
			var price = $("<p>", { class: "price", text: item.price } );
			coverHolder.append(price);
			div.append(img);
			var author = $("<p>", { class: "author", text: item.author });
			var date = $("<p>", { class: "date", text: item.date.getFullYear() });
			var duration = $("<p>", { class: "duration", text: item.duration, title: "Length of video" });
			duration.on("input", onChangeDuration);

			coverHolder.append(h);
			coverHolder.append(div);
			coverHolder.append(author);
			coverHolder.append(date);
			coverHolder.append(duration);

			el.append(coverHolder);

			var listHolder = $("<div>", { class: "list-holder" });
			var t = ", " + item.author + " (" + item.date.getFullYear() + ") " + item.price + " " + item.isbn;
			var p = $("<p>");
			var newlink = a.clone();
			newlink.click(onClickLink);
			p.append(newlink);
			p.append($("<span>", { class: "author", text: item.author} ));
			p.append($("<span>", { class: "date", text: item.date.getFullYear() }));
			p.append($("<span>", { class: "duration", text: item.duration }));
			p.append($("<span>", { class: "price", text: item.price }));
			p.append($("<span>", { class: "isbn", text: item.isbn }));
			listHolder.append(p);

			el.append(listHolder);

			container.append(el);
		}

		$("#num-showing").text(items.length + " showing");
	}

	function initializeCatalog () {
		// this seemed to fix the initial odd word spacing
		$(".isotope h3").css("word-break", "break-word");

		$(".isotope").isotope({
			layoutMode: 'fitRows',
			itemSelector: '.catalog-item',
			getSortData: {
				author: ".author",
				upperAuthor: function (itemElem) {
					return $(itemElem).find(".author").text().toUpperCase();
				},
				title: '.title',
				upperTitle: function (itemElem) {
					return $(itemElem).find(".title").text().toUpperCase();
				},
				"highest-price": '[data-price] parseFloat',
				"lowest-price": '[data-price] parseFloat',
				"newest": "[data-date]",
				"oldest": "[data-date]"
			},
			sortAscending: {
				"highest-price": false,
				"lowest-price": true,
				"newest": false,
				"oldest": true
			},
			sortBy: "newest"
		});

		$(".isotope").on("arrangeComplete", function (event, filteredItems) {
			$("#num-showing").text(filteredItems.length + " showing");

			colorCodeResults(filteredItems);
		});
	}

	function relayoutCatalog () {
		$(".isotope").isotope("layout");
	}

	function getSelectedKeywords () {
		var btns = $("#keyword-buttons input:checked");
		var selected = [];
		btns.map(function (i, e) {
			var text = $(e).parent().text().trim();
			selected.push(text);
		});

		return selected;
	}

	function setSelectedKeywords (keywords) {
		$("#keyword-buttons input").prop("checked", false);
		$("#keyword-buttons label.keyword-btn").removeClass("active");

		for (var i = 0; i < keywords.length; i++) {
			var keyword = keywords[i];
			var btn = $(".keyword-btn[data-keywords='" + keyword + "']");
			btn.find("input").prop("checked", true);
			btn.addClass("active");
		}

		refreshKeywordCount();
	}

	function onClickKeyword (event) {
		if (!admin) {
			refreshBasedOnKeywords();
		} else {
			refreshKeywordCount();

			// save new keywords for this isbn
			var isbn = getSelectedISBN();
			setItemData(isbn, "keywords", getSelectedKeywords().join(","));
		}
	}

	function refreshBasedOnKeywords () {
		refreshKeywordCount();

		$(".isotope").isotope({filter: filterBySelectedKeywords});
	}

	function refreshKeywordCount () {
		var keys = getSelectedKeywords();
		var lbl = keys.length;
		if (keys.length == 0) lbl = "none";
		else if (keys.length == $("#keyword-buttons input").length) lbl = "all";


		$("#num-filters").text(lbl + " selected");
	}

	function filterBySelectedKeywords (keys) {
		var keys = getSelectedKeywords();
		var this_keys = $(this).attr("data-keywords").split(",");
		for (var i = 0; i < this_keys.length; i++) {
			var k = trimString(this_keys[i]);
			if (keys.indexOf(k) != -1) {
				return true;
			}
		}
		return false;
	}

	function onClickSort (event) {
		$("#sort-buttons label").removeClass("btn-primary").addClass("btn-default");
		$(event.target).removeClass("btn-default").addClass("btn-primary");

		var sortByValue = $(this).find("input").attr("data-sort-by");

		$(".isotope").isotope({ sortBy: sortByValue });
	}

	function onClickView (event) {
		$("#view-buttons label").removeClass("btn-primary").addClass("btn-default");
		$(event.currentTarget).removeClass("btn-default").addClass("btn-primary");

		var view = $(this).find("input").attr("data-view");

		$("#catalog").removeClass("list-view covers-view");

		switch (view) {
			case "list":
				$("#catalog").addClass("list-view");
				$(".isotope").isotope({ layoutMode: 'vertical' })
				break;
			case "covers":
				$("#catalog").addClass("covers-view");
				$(".isotope").isotope({ layoutMode: 'fitRows' })
				break;
		}
	}

	function updateDownloadList () {
		var textToWrite = "title\tauthor\tdate\tprice\tduration\tISBN\n";

		var iso = $(".isotope").data('isotope');
		for (var i = 0; i < iso.filteredItems.length; i++) {
			var el = $(iso.filteredItems[i].element);

			var show = el.attr("data-show");
			if (show == "hide") {
				// hidden item
			} else {
				var d = new Date(parseInt(el.attr("data-date")));
				var date = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();

				var t = el.attr("data-title") + "\t" + el.attr("data-author") + "\t" + date + "\t$" + el.attr("data-price") + "\t" + el.attr("data-duration") + "\t" + el.attr("data-isbn");

				textToWrite += t + "\n";
			}
		}

		var textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'});
		var fileNameToSaveAs = "itp_catalog_list_export.txt";
		var downloadLink = $("#downloadLink")[0];
		downloadLink.download = fileNameToSaveAs;
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
	}

	function getCatalogAsBlob () {
		var textToWrite = "ISBN 10\tISBN 13\tTitle\tAuthor\tLength\tDiscount\tInstock\tList Price\tEditor\tCategory\tShow\r\n";

		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			var t = item.isbn10 + "\t" + item.isbn + "\t" + item.title + "\t" + item.author + "\t" + item.duration + "\t" + item.discountCode + "\t" + item.instock + "\t" + item.price + "\t" + item.editor + "\t" +  item.keywords + "\t" + item.show;

			textToWrite += t + "\r\n";
		}

		return new Blob([textToWrite], {type: 'text/plain'});
	}

	function colorCodeResults (items) {
		for (var i = 0; i < items.length; i++) {
			var item = $(items[i].element);
			if (i % 2 == 0)
				item.addClass("even");
			else
				item.removeClass("even");
		}
	}

	function onClickToggleAll (event) {
		$("#keyword-buttons input").prop("checked", toggleOn);
		if (!toggleOn) {
			$("#keyword-buttons label.keyword-btn").removeClass("active");
		} else {
			$("#keyword-buttons label.keyword-btn").addClass("active");
		}

		toggleOn = !toggleOn;

		refreshBasedOnKeywords();
	}

	function onClickLogo (event) {
		if (admin) {
			signoutApp();

			setAdmin(false);
		} else {
			validateAdmin();
		}

		$("#filter-pane").data("bs.affix").options.offset = $("#catalog-row").offset().top;
	}

	function signoutApp () {
		firebase.auth().signOut().then(function() {
			// Sign-out successful.
		}, function(error) {
			// An error happened.
		});
	}

	function validateAdmin () {
		/*
		if ($("#adminInput").val() == "charlie") {
			setAdmin(true);
		}
		*/

		var provider = new firebase.auth.GoogleAuthProvider();
//		provider.addScope('email');

		firebase.auth().signInWithPopup(provider).then(function(result) {
			// This gives you a Google Access Token. You can use it to access the Google API.
			var token = result.credential.accessToken;
			// The signed-in user info.
			var user = result.user;
			// ...
			setAdmin(true);
		}).catch(function(error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			// The email of the user's account used.
			var email = error.email;
			// The firebase.auth.AuthCredential type that was used.
			var credential = error.credential;
			// ...
		});

	}

	function setAdmin (val) {
		if (val) {
			$("#admin-access").show();
			$("body").addClass("admin");
			$(".catalog-item p.duration").attr("contenteditable", true);
		} else {
			$("#admin-access").hide();
			$("body").removeClass("admin");
			$(".catalog-item p.duration").attr("contenteditable", false);
		}

		admin = val;

		relayoutCatalog();
	}

	function onClickLink (event) {
		if (admin) {
			event.preventDefault();

			var item = $(event.target).parents(".catalog-item");

			var isbn = item.attr("data-isbn");

			var sel = item.hasClass("selected");

			$(".isotope .catalog-item.selected").removeClass("selected");

			if (!sel) {
				item.addClass("selected");

				savedKeywords = getSelectedKeywords();

				showForEditing(isbn);

				refreshKeywordCount();
			} else {
				setSelectedKeywords(savedKeywords);
			}
		}
	}

	function showForEditing (isbn) {
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item.isbn == isbn) {
				var categories = item.keywords.split(",").map(function (item, element) { return item.trim(); });
				setSelectedKeywords(categories);
			}
		}
	}

	function getSelectedISBN () {
		var sel = $(".catalog-item.selected");
		if (sel.length)
			return sel.attr("data-isbn");
		else
			return undefined;
	}

	function setItemData (isbn, field, data) {
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item.isbn == isbn) {
				item[field] = data;
				break;
			}
		}
	}

	function onClickAddKeyword (event) {
		var keyword = $("#addKeywordInput").val();
		if (keyword) {
			addKeywordButton(keyword, false);

			$("#addKeywordInput").val("");
		}
	}

	function onClickShowHide (event) {
		var check = $(event.target);
		var item = check.parents(".catalog-item");
		var show = check.prop("checked");
		item.attr("data-show", show);
		if (show)
			item.removeClass("hidden-item");
		else
			item.addClass("hidden-item");

		var isbn = item.attr("data-isbn");
		setItemData(isbn, "show", show ? "" : "hide");
	}

	function onChangeDuration (event) {
		var duration = $(event.target).text();

		var item = $(event.target).parents(".catalog-item");
		var isbn = item.attr("data-isbn");

		setItemData(isbn, "duration", duration);
	}

	function onClickUpdateCatalog (event) {
		var textBlob = getCatalogAsBlob();

		var storage = firebase.storage();
		var storageRef = storage.ref();
		var ref = storageRef.child("catalog.txt");
		ref.put(textBlob).then(function(snapshot) {
			$("#myModal").modal();
		});
	}

	$.ajax({
		type: 'GET',
		url: data_url,
	}).done(onDataLoaded);

	configureFirebase();
});
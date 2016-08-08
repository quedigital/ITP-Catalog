$(function () {

	var url = "catalog.txt";

	var keywords = [];
	var items = [];

	var toggleOn = false;

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
			if (j != -1 && n > 0) {
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
					isbn: trimString(row[1]),
					title: trimString(row[2]),
					author: trimString(row[3]),
					date: toDate(row[6]),
					price: row[7],
					keywords: key
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
		var classes = ["keyword-1", "keyword-2", "keyword-3", "keyword-4", "keyword-5"];

		for (var i = 0; i < keywords.length; i++) {
			var key = keywords[i];

			var btn = $("<label>", {class: "btn btn-primary keyword-btn active", "data-keywords": key });
			var input = $("<input>", {type: "checkbox", autocomplete: "off"}).prop("checked", true);
			var span = $("<span>", {class: "glyphicon glyphicon-ok"});

			btn.addClass(classes[i % classes.length]);
			var lbl = $("<span>", { text: " " + key });
			btn.append(lbl);
			btn.append(input);
			btn.prepend(span);
			$("#keyword-buttons").append(btn);
		}

		$("#keyword-buttons .btn").on("change", onClickKeyword);
		$("#sort-buttons .btn").on("change", onClickSort);
		$('#view-buttons').on('click', '.btn', onClickView);
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
				"data-index": i
			});

			var coverHolder = $("<div>", { class: "cover-holder" });

			var h = $("<h3>");
			var a = $("<a>", { class: "title", text: item.title, href: "http://www.informit.com/title/" + item.isbn, target: "_blank" });
			h.append(a);
			var div = $("<div>", { class: "cover"} );
			var img = $("<img>", { src: "https://www.informit.com/ShowCover.aspx?isbn=" + item.isbn + "&type=f" } );
			img.on("load", function () { relayoutCatalog(); });
			var price = $("<p>", { class: "price", text: item.price } );
			coverHolder.append(price);
			div.append(img);
			var author = $("<p>", { class: "author", text: item.author });
			var date = $("<p>", { class: "date", text: item.date.getFullYear() });
			coverHolder.append(h);
			coverHolder.append(div);
			coverHolder.append(author);
			coverHolder.append(date);

			el.append(coverHolder);

			var listHolder = $("<div>", { class: "list-holder" });
			var t = ", " + item.author + " (" + item.date.getFullYear() + ") " + item.price + " " + item.isbn;
			var p = $("<p>");
			p.append(a.clone());
			p.append($("<span>", { class: "author", text: item.author} ));
			p.append($("<span>", { class: "date", text: item.date.getFullYear() }));
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

	function onClickKeyword (event) {
		refreshBasedOnKeywords();
	}

	function refreshBasedOnKeywords () {
		var keys = getSelectedKeywords();
		var lbl = keys.length;
		if (keys.length == 0) lbl = "none";
		else if (keys.length == $("#keyword-buttons input").length) lbl = "all";


		$("#num-filters").text(lbl + " selected");

		$(".isotope").isotope({filter: filterBySelectedKeywords});
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
		$(event.target).parent("label").removeClass("btn-default").addClass("btn-primary");

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
		var textToWrite = "title\tauthor\tdate\tprice\tISBN\n";

		var iso = $(".isotope").data('isotope');
		for (var i = 0; i < iso.filteredItems.length; i++) {
			var el = $(iso.filteredItems[i].element);

			var d = new Date(parseInt(el.attr("data-date")));
			var date = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();

			var t = el.attr("data-title") + "\t" + el.attr("data-author") + "\t" + date + "\t" + el.attr("data-price") + "\t" + el.attr("data-isbn");

			textToWrite += t + "\n";
		}

		var textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'});
		var fileNameToSaveAs = "itp_catalog_list_export.txt";
		var downloadLink = $("#downloadLink")[0];
		downloadLink.download = fileNameToSaveAs;
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
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

	$.ajax({
		type: 'GET',
		url: url,
	}).done(onDataLoaded);
});
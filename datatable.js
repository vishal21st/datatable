"use strict";

let DataTable = (function() {
  
  // DataTable Function or Base Class to be returned by this IIF
  function DataTable(config) {
    try {
      if (config) {
        this.currentPage = 0; // current page number for pagination
        this.pages = 0; // number of pages initial set to 0
        this.tableSelector = config.selector; //selector Id for element where dataTable to be rendered
        this.data = config.data || []; // Data rows 
        this.columns = config.columns; // list of columns ['column1','column2'] to be shown in table
        this.dom = document.getElementById(this.tableSelector); // cached dom element of given id
        this.limit = 10; //default pagination limit
        this.isHeaderFixed = config.isHeaderFixed; // to fix the table header
        this.isPaginated = config.isPaginated; // to make table paginated
        this.rows = this.getRows(); // processed rows in datatable format for internal use
        this.columnsType = {}; // sets type of each column {column: string, column2: number} etc,
        this.currentSort = {}; // sets the current column to be sorted and type of sort
        this.setColumnsType(); // function call to set the column types
      }
    } catch(err) {
      console.error("Failed to load Datatable", err)
    } 
  }

  DataTable.prototype.setColumnsType = function() {
    let row = this.rows[0];
    this.columns.forEach(column => {
      this.columnsType[column.data] = { isString: isNaN(row[column.data]) };
    });
  };

  DataTable.prototype.filter = function(val, column) {
    let rows = this.getRows();
    let isString = this.columnsType[column].isString;
    this.rows = rows.filter(row => {
      if (isString) {
        return row[column].toUpperCase().includes(val.toUpperCase());
      } else {
        return row[column] == parseInt(val);
      }
    });
    this.reDrawRows();
  };

  DataTable.prototype.sort = function(column) {
    let isSortString = this.columnsType[column].isString;

    if (this.currentSort.hasOwnProperty(column)) {
      this.currentSort[column]["asc"] = !this.currentSort[column]["asc"];
    } else {
      this.currentSort = {};
      this.currentSort[column] = { asc: true };
    }
    let isAsc = this.currentSort[column].asc;
    if (isSortString) {
      this.rows = this.rows.sort((a, b) => {
        if (a[column] > b[column]) {
          return 1;
        } else {
          return -1;
        }
      });

      if (!isAsc) {
        this.rows = this.rows.reverse();
      }
    } else {
      if (isAsc) {
        this.rows = this.rows.sort((a, b) => a[column] - b[column]);
      } else {
        this.rows = this.rows.sort((a, b) => b[column] - a[column]);
      }
    }
    this.draw();
  };

  //return array of rows to be shown after applying limit
  DataTable.prototype.getRows = function() {
    let startIndex = 0;
    let limit = this.limit;

    startIndex = this.currentPage * this.limit;

    if (this.limit + startIndex > this.data.length) {
      limit = startIndex + this.data.length - startIndex;
    } else {
      limit = startIndex + this.limit;
    }

    return this.data
      .map(data => {
        let obj = {};
        this.columns.forEach(column => {
          obj[column.data] = data[column.data];
        });
        return obj;
      })
      .slice(startIndex, limit);
  };

  // return <th> tag template with innerHtml 
  DataTable.prototype.TH = function(column) {
    let sortClass = "sorting";

    if (column.isSortable) {
      if (!this.currentSort[column.data]) {
        sortClass = `${sortClass}_both`;
      } else {
        sortClass = this.currentSort[column.data]["asc"]
          ? `${sortClass}_asc`
          : `${sortClass}_desc`;
      }
    }

    return `<th  data-columnName="${column.data}" data-issortable="${column.isSortable}" class="${sortClass}" tabindex="0" aria-controls="example" rowspan="1" colspan="1" style="width: 118px;"
            aria-sort="ascending" aria-label="Name: activate to sort column descending">${column.header}</th>`;
  };

  //return searchBox Template
  DataTable.prototype.SearchBox = function(column) {
    let type = this.columnsType[column.data].isString ? "text" : "number";
    return `<td><input class="input-search" data-search="true" data-columnname="${column.data}" placeholder="search" type="${type}"/></td>`;
  };

  //return thead template
  DataTable.prototype.tableHead = function() {
    return `<thead>
        <tr role="row">
          ${this.columns.map(column => this.TH(column)).join("")}     
        </tr>
      </thead>`;
  };

  //return tr for searchboxes template
  DataTable.prototype.searchBoxRow = function() {
    return `<tr role="row" class="odd">
    ${this.columns
      .map(column =>
        column.isFilterable ? this.SearchBox(column) : "<td></td>"
      )
      .join("")}
        </tr>`;
  };

  // return  <td> template
  DataTable.prototype.tableData = function(data) {
    return `<td>${data}</td>`;
  };

  // return a tr with td inside template
  DataTable.prototype.tableRow = function(row) {
    return `<tr role="row" class="data-row">
        ${Object.keys(row)
          .map(data => this.tableData(row[data]))
          .join("")}
        </tr>`;
  };

  // return all tr template
  DataTable.prototype.tableRows = function() {
    return this.rows.map(row => this.tableRow(row)).join("");
  };


  //method to redraw only table rows after sort, filter, pagination
  DataTable.prototype.reDrawRows = function() {
    let trs = this.dom.querySelectorAll("tbody tr");
    let bodyNode = this.dom.querySelectorAll("tbody")[0];
    Array.from(document.getElementsByClassName("data-row")).forEach(el => {
      bodyNode.removeChild(el);
    });
    let rows = this.tableRows();

    let tbody = document.createElement("tbody");
    tbody.innerHTML = rows;

    Array.from(tbody.children).forEach(el => {
      bodyNode.appendChild(el);
    });
  };

  //use this method to draw datatable
  DataTable.prototype.draw = function() {
    let tpl = `<table class="data-table ${
      this.isHeaderFixed ? "sticky-header" : ""
    }" style="width: 100%;" role="grid" aria-describedby="example_info">
                  ${this.tableHead(this.columns)}
                  <tbody>${this.searchBoxRow()}${this.tableRows()}</tbody>
                </table>
              <div class="paginate-wrapper">
                ${this.isPaginated ? this.paginate() : ""} </div>`;

    this.dom.innerHTML = tpl;
    this.bindEvents();
  };

  //method to bind all events for sort, search, pagination
  DataTable.prototype.bindEvents = function() {
    this.bindSortEvent();
    this.bindSearchEvent();
    this.bindPagination();
  };


  //method to bind event for searchbox
  DataTable.prototype.bindSearchEvent = function() {
    let selector = `#${this.tableSelector} input`;
    let _ = this;
    document.querySelectorAll(selector).forEach(function(item) {
      item.addEventListener("keyup", function(event) {
        _.filter(event.target.value, event.target.dataset["columnname"]);
      });
    });
  };

  //method to bind sort event
  DataTable.prototype.bindSortEvent = function() {
    let selector = `#${this.tableSelector} th`;
    let _ = this;
    document.querySelectorAll(selector).forEach(function(item) {
      item.addEventListener("click", function(event) {
        if (event.target.dataset["issortable"] == "true") {
          _.sort(event.target.dataset["columnname"]);
        }
      });
    });
  };


  // method to bind pagination
  DataTable.prototype.bindPagination = function() {
    if (!this.isPaginated) return;
    let _ = this;
    document.querySelectorAll(".paginate-button").forEach(function(item) {
      item.addEventListener("click", function(event) {
        _.showPage(event.target.dataset["page"]);
      });
    });
    document
      .querySelectorAll(".limit-select")[0]
      .addEventListener("change", function(event) {
        _.limit = parseInt(event.target.value);
        _.showPage(_.currentPage);
        _.redrawPaginationEl();
        document.querySelectorAll(".limit-select")[0].value = _.limit;
      });

    this.toggleActiveClassFromPageButton(this.currentPage, true);
  };

  //method to be called when new page selected in paginate index
  DataTable.prototype.showPage = function(page) {
    this.toggleActiveClassFromPageButton(this.currentPage, false);
    let shouldUpdate = true;
    if (page == "next") {
      if (this.currentPage != this.pages.length - 1) {
        this.currentPage += 1;
      } else {
        shouldUpdate = false;
      }
    } else if (page == "previous") {
      if (this.currentPage != 0) {
        this.currentPage -= 1;
      } else {
        shouldUpdate = false;
      }
    } else {
      this.currentPage = parseInt(page);
    }

    if (shouldUpdate) {
      this.rows = this.getRows();
      this.reDrawRows();
    }

    this.toggleActiveClassFromPageButton(this.currentPage, true);
  };

  // method to return pagelink for pagination
  DataTable.prototype.pageLink = function(pageNum) {
    return `<a
      class="paginate-button "
      aria-controls="example"
      data-page="${pageNum}"
      >${pageNum}</a>`;
  };

  // method to return previous link for pagination
  DataTable.prototype.previous = function() {
    return `<a
    class="paginate-button previous"
    id="previous"
    data-page="previous"
    >Previous</a>`;
  };

  //method to return next link for pagination
  DataTable.prototype.next = function() {
    return `<a
    class="paginate-button next"
    id="next"
    data-page="next"
    >Next</a>`;
  };

  //method to highlight or toggle active class in pagination
  DataTable.prototype.toggleActiveClassFromPageButton = function(page, isAdd) {
    let button = this.dom.querySelector(
      `.paginate-button[data-page="${page}"]`
    );
    if (isAdd) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  };

  // method tp redraw pagination indexes
  DataTable.prototype.redrawPaginationEl = function() {
    document.querySelector(".paginate-wrapper").innerHTML = this.paginate();
    this.bindPagination();
  };

  // method to get pagination template
  DataTable.prototype.paginate = function() {
    let pageNum = Math.ceil(this.data.length / this.limit);
    this.pages = Array.from(Array(pageNum).keys());

    let tpl = `<div class="paginate">
      ${this.entries()}
      ${this.previous()}
      ${this.pages.map(num => this.pageLink(num)).join("")}
      ${this.next()}
    </div>
    `;
    return tpl;
  };

  // method to return limit dropdown
  DataTable.prototype.entries = function() {
    return `<div class="entries" id="limit">
      <label>Show 
      <select  class="limit-select">
      <option value="10">10</option><option value="25">25</option>
      <option value="50">50</option><option value="100">100</option>
      </select> entries</label>
    </div>`;
  };

  return DataTable;
})();
//Databele code end here

// initialization of data table
let table = new DataTable({
  selector: "table",
  data: data,
  isHeaderFixed: true,
  isPaginated: true,
  columns: [
    {
      header: "Name",
      data: "name",
      isSortable: true,
      isFilterable: true
    },
    {
      header: "Capital",
      data: "capital",
      isSortable: true,
      isFilterable: true
    },
    {
      header: "Population",
      data: "population",
      isSortable: true,
      isFilterable: true
    },
    {
      header: "Region",
      data: "region",
      isSortable: false,
      isFilterable: false
    },
    {
      header: "Subregion",
      data: "subregion",
      isSortable: false,
      isFilterable: false
    }
  ]
});

table.draw();

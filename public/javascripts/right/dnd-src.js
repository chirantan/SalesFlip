/**
 * Drag'n'Drop module for RightJS
 *
 * See http://rightjs.org/goods/drag-n-drop
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
if (!RightJS) throw "Gimme RightJS";

/**
 * Draggable unit
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
var Draggable = new Class(Observer, {
  extend: {
    EVENTS: $w('before start drag stop drop'),
    
    Options: {
      handle:            null,        // a handle element that will start the drag
                                      
      snap:              0,           // a number in pixels or [x,y]
      axis:              null,        // null or 'x' or 'y' or 'vertical' or 'horizontal'
      range:             null,        // {x: [min, max], y:[min, max]} or reference to another element
                                      
      dragClass:         'dragging',  // the in-process class name
                                      
      clone:             false,       // if should keep a clone in place
      revert:            false,       // marker if the object should be moved back on finish
      revertDuration:    'normal',    // the moving back fx duration
                                      
      scroll:            true,        // if it should automatically scroll        
      scrollSensitivity: 32,          // the scrolling area size in pixels
      
      zIndex:            10000000,    // the element's z-index
      moveOut:           false,       // marker if the draggable should be moved out of it's context (for overflown elements)
      
      relName:           'draggable'  // the audodiscovery feature key
    },
    
    // referenece to the currently active draggable
    current: null,
    
    // scans the document for auto-processed draggables with the rel="draggable" attribute
    rescan: function(scope) {
      var key = this.Options.relName;
      
      ($(scope)||document).select('*[rel^="'+key+'"]').each(function(element) {
        if (!element._draggable) {
          var data = element.get('data-'+key+'-options');
          new this(element, eval('('+data+')') || {});
        }
      }, this);
    }
  },
  
  /**
   * Basic controller
   *
   * @param mixed element reference
   * @param Object options
   */
  initialize: function(element, options) {
    this.element = $(element);
    this.$super(options);
    
    this.element._draggable = this.init();
  },
  
  /**
   * detaches the mouse observers out of the draggable element
   *
   * @return this
   */
  destroy: function() {
    this.handle.stopObserving('mousedown', this._dragStart);
    delete(this.element._draggable);
    
    return this;
  },
  
  // additional options processing
  setOptions: function(options) {
    this.$super(options);
    
    // checking the handle
    this.handle = this.options.handle ? $(this.options.handle) : this.element;
    
    // checking the spappings
    if (isArray(this.options.snap)) {
      this.snapX = this.options.snap[0];
      this.snapY = this.options.snap[1];
    } else {
      this.snapX = this.snapY = this.options.snap;
    }
    
    return this;
  },
  
  /**
   * Moves the element back to the original position
   *
   * @return this
   */
  revert: function() {
    var position  = this.clone.position();
    var end_style = {
      top:  (position.y + this.ryDiff) + 'px',
      left: (position.x + this.rxDiff) + 'px'
    };
    
    if (this.options.revertDuration && this.element.morph) {
      this.element.morph(end_style, {
        duration: this.options.revertDuration,
        onFinish: this.swapBack.bind(this)
      });
    } else {
      this.element.setStyle(end_style);
      this.swapBack();
    }
    
    return this;
  },
  
// protected

  init: function() {
    // caching the callback so that we could detach it later
    this._dragStart = this.dragStart.bind(this);
    
    this.handle.onMousedown(this._dragStart);
    
    return this;
  },
  
  // handles the event start
  dragStart: function(event) {
    this.fire('before', this, event.stop());
    
    // calculating the positions diff
    var position = position = this.element.position();
    
    this.xDiff = event.pageX - position.x;
    this.yDiff = event.pageY - position.y;
    
    // grabbing the relative position diffs
    var relative_position = {
      y: this.element.getStyle('top').toFloat(),
      x: this.element.getStyle('left').toFloat()
    };
    
    this.rxDiff = isNaN(relative_position.x) ? 0 : (relative_position.x - position.x);
    this.ryDiff = isNaN(relative_position.y) ? 0 : (relative_position.y - position.y);
    
    // preserving the element sizes
    var size = {
      x: this.element.getStyle('width'),
      y: this.element.getStyle('height')
    };
    
    if (size.x == 'auto') size.x = this.element.offsetWidth  + 'px';
    if (size.y == 'auto') size.y = this.element.offsetHeight + 'px';
    
    // building a clone element if necessary
    if (this.options.clone || this.options.revert) {
      this.clone = $(this.element.cloneNode(true)).setStyle({
        visibility: this.options.clone ? 'visible' : 'hidden'
      }).insertTo(this.element, 'before');
    }
    
    // reinserting the element to the body so it was over all the other elements
    this.element.setStyle({
      position: 'absolute',
      zIndex:   Draggable.Options.zIndex++,
      top:      (position.y + this.ryDiff) + 'px',
      left:     (position.x + this.rxDiff) + 'px',
      width:    size.x,
      height:   size.y
    }).addClass(this.options.dragClass);
    
    if (this.options.moveOut) this.element.insertTo(document.body);
    
    
    // caching the window scrolls
    this.winScrolls = window.scrolls();
    this.winSizes   = window.sizes();
    
    Draggable.current = this.calcConstraints().fire('start', this, event);
  },
  
  // catches the mouse move event
  dragProcess: function(event) {
    var page_x = event.pageX, page_y = event.pageY, x = page_x - this.xDiff, y = page_y - this.yDiff;
    
    // checking the range
    if (this.ranged) {
      if (this.minX > x) x = this.minX;
      if (this.maxX < x) x = this.maxX;
      if (this.minY > y) y = this.minY;
      if (this.maxY < y) y = this.maxY;
    }
    
    // checking the scrolls
    if (this.options.scroll) {
      var scrolls = {x: this.winScrolls.x, y: this.winScrolls.y},
        sensitivity = this.options.scrollSensitivity;
      
      if ((page_y - scrolls.y) < sensitivity) {
        scrolls.y = page_y - sensitivity;
      } else if ((scrolls.y + this.winSizes.y - page_y) < sensitivity){
        scrolls.y = page_y - this.winSizes.y + sensitivity;
      }
      
      if ((page_x - scrolls.x) < sensitivity) {
        scrolls.x = page_x - sensitivity;
      } else if ((scrolls.x + this.winSizes.x - page_x) < sensitivity){
        scrolls.x = page_x - this.winSizes.x + sensitivity;
      }
      
      if (scrolls.y < 0) scrolls.y = 0;
      if (scrolls.x < 0) scrolls.x = 0;
      
      if (scrolls.y < this.winScrolls.y || scrolls.y > this.winScrolls.y ||
        scrolls.x < this.winScrolls.x || scrolls.x > this.winScrolls.x) {
        
          window.scrollTo(this.winScrolls = scrolls);
      }
    }
    
    // checking the snaps
    if (this.snapX) x = x - x % this.snapX;
    if (this.snapY) y = y - y % this.snapY;
    
    // checking the constraints
    if (!this.axisY) this.element.style.left = (x + this.rxDiff) + 'px';
    if (!this.axisX) this.element.style.top  = (y + this.ryDiff) + 'px';
    
    this.fire('drag', this, event);
  },
  
  // handles the event stop
  dragStop: function(event) {
    this.element.removeClass(this.options.dragClass);
    
    // notifying the droppables for the drop
    Droppable.checkDrop(event, this);
    
    if (this.options.revert) {
      this.revert();
    }
    
    Draggable.current = null;
    
    this.fire('stop', this, event);
  },
  
  // swaps the clone element to the actual element back
  swapBack: function() {
    if (this.clone) {
      this.clone.insert(
        this.element.setStyle({
          width:    this.clone.getStyle('width'),
          height:   this.clone.getStyle('height'),
          position: this.clone.getStyle('position'),
          zIndex:   this.clone.getStyle('zIndex')
        }), 'before'
      ).remove();
    }
  },
  
  // calculates the constraints
  calcConstraints: function() {
    var axis = this.options.axis;
    this.axisX = ['x', 'horizontal'].include(axis);
    this.axisY = ['y', 'vertical'].include(axis);
    
    this.ranged = false;
    var range = this.options.range;
    if (range) {
      this.ranged = true;
      
      // if the range is defined by another element
      var element = $(range);
      if (isElement(element)) {
        var dims = element.dimensions();
        
        range = {
          x: [dims.left, dims.left + dims.width],
          y: [dims.top,  dims.top + dims.height]
        };
      }

      if (isHash(range)) {
        var size = this.element.sizes();
        
        if (range.x) {
          this.minX = range.x[0];
          this.maxX = range.x[1] - size.x;
        }
        if (range.y) {
          this.minY = range.y[0];
          this.maxY = range.y[1] - size.y;
        }
      }
    }
    
    return this;
  }
});
/**
 * Droppable unit
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
var Droppable = new Class(Observer, {
  extend: {
    EVENTS: $w('drop hover leave'),
    
    Options: {
      accept:      '*',
      containment: null,    // the list of elements (or ids) that should to be accepted
      
      overlap:     null,    // 'x', 'y', 'horizontal', 'vertical', 'both'  makes it respond only if the draggable overlaps the droppable
      overlapSize: 0.5,     // the overlapping level 0 for nothing 1 for the whole thing
      
      allowClass:  'droppable-allow',
      denyClass:   'droppable-deny',
      
      relName:     'droppable'   // automatically discovered feature key
    },
    
    // See the Draggable rescan method, case we're kinda hijacking it in here
    rescan: eval('({f:'+Draggable.rescan.toString().replace(/\._draggable/g, '._droppable')+'})').f,
    
    /**
     * Checks for hoverting draggable
     *
     * @param Event mouse event
     * @param Draggable draggable
     */
    checkHover: function(event, draggable) {
      for (var i=0, length = this.active.length; i < length; i++)
        this.active[i].checkHover(event, draggable);
    },
    
    /**
     * Checks for a drop
     * 
     * @param Event mouse event
     * @param Draggable draggable
     */
    checkDrop: function(event, draggable) {
      for (var i=0, length = this.active.length; i < length; i++)
        this.active[i].checkDrop(event, draggable);
    },
    
    active: []
  },
  
  /**
   * Basic cosntructor
   *
   * @param mixed the draggable element reference
   * @param Object options
   */
  initialize: function(element, options) {
    this.element = $(element);
    this.$super(options);
    
    Droppable.active.push(this.element._droppable = this);
  },
  
  /**
   * Detaches the attached events
   *
   * @return self
   */
  destroy: function() {
    Droppable.active = Droppable.active.without(this);
    delete(this.element._droppable);
    return this;
  },
  
  /**
   * checks the event for hovering
   *
   * @param Event mouse event
   * @param Draggable the draggable object
   */
  checkHover: function(event, draggable) {
    if (this.hoveredBy(event, draggable)) {
      if (!this._hovered) {
        this._hovered = true;
        this.element.addClass(this.options[this.allows(draggable) ? 'allowClass' : 'denyClass']);
        this.fire('hover', draggable, this, event);
      }
    } else if (this._hovered) {
      this._hovered = false;
      this.reset().fire('leave', draggable, this, event);
    }
  },
  
  /**
   * Checks if it should process the drop from draggable
   *
   * @param Event mouse event
   * @param Draggable draggable
   */
  checkDrop: function(event, draggable) {
    this.reset();
    if (this.hoveredBy(event, draggable) && this.allows(draggable)) {
      draggable.fire('drop', this, draggable, event);
      this.fire('drop', draggable, this, event);
    }
  },
  
  /**
   * resets the element state
   *
   * @return self
   */
  reset: function() {
    this.element.removeClass(this.options.allowClass).removeClass(this.options.denyClass);
    return this;
  },
  
// protected

  // checks if the element is hovered by the event
  hoveredBy: function(event, draggable) {
    var dims     = this.element.dimensions(),
        t_top    = dims.top,
        t_left   = dims.left,
        t_right  = dims.left + dims.width,
        t_bottom = dims.top  + dims.height,
        event_x  = event.pageX,
        event_y  = event.pageY;
    
    // checking the overlapping
    if (this.options.overlap) {
      var drag_dims = draggable.element.dimensions(),
          level     = this.options.overlapSize,
          top       = drag_dims.top,
          left      = drag_dims.left,
          right     = drag_dims.left + drag_dims.width,
          bottom    = drag_dims.top  + drag_dims.height;
      
      
      switch (this.options.overlap) {
        // horizontal overlapping only check
        case 'x':
        case 'horizontal':
          return (
            (top    > t_top    && top      < t_bottom) ||
            (bottom > t_top    && bottom   < t_bottom)
          ) && (
            (left   > t_left   && left    < (t_right - dims.width * level)) ||
            (right  < t_right  && right   > (t_left  + dims.width * level))
          );
          
        // vertical overlapping only check
        case 'y':
        case 'vertical':
          return (
            (left   > t_left   && left   < t_right) ||
            (right  > t_left   && right  < t_right)
          ) && (
            (top    > t_top    && top    < (t_bottom - dims.height * level)) ||
            (bottom < t_bottom && bottom > (t_top + dims.height * level))
          );
          
        // both overlaps check
        default:
          return (
            (left   > t_left   && left    < (t_right - dims.width * level)) ||
            (right  < t_right  && right   > (t_left  + dims.width * level))
          ) && (
            (top    > t_top    && top    < (t_bottom - dims.height * level)) ||
            (bottom < t_bottom && bottom > (t_top + dims.height * level))
          );
      }
      
    } else {
      // simple check agains the event position
      return event_x > t_left && event_x < t_right && event_y > t_top && event_y < t_bottom;
    }
  },
  
  // checks if the object accepts the draggable
  allows: function(draggable) {
    if (this.options.containment && !this._scanned) {
      this.options.containment.walk($);
      this._scanned = true;
    }
    
    // checking the invitations list
    var welcomed = this.options.containment ? this.options.containment.includes(draggable.element) : true;
    
    return welcomed && (this.options.accept == '*' ? true : draggable.element.match(this.options.accept));
  }
  
});
/**
 * The document events hooker
 *
 * Copyright (C) 2009 Nikolay V. Nemshilov aka St.
 */
document.on({
  // parocesses the automatically discovered elements
  ready: function() {
    Draggable.rescan();
    Droppable.rescan();
  },
  
  // watch the draggables moving arond
  mousemove: function(event) {
    if (Draggable.current) {
      Draggable.current.dragProcess(event);
      Droppable.checkHover(event, Draggable.current);
    }
  },
  
  // releases the current draggable on mouse up
  mouseup: function(event) {
    if (Draggable.current) {
      Draggable.current.dragStop(event);
    }
  }
});
/**
 * Element level hooks for drag'n'drops
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
Element.addMethods({
  
  makeDraggable: function(options) {
    new Draggable(this, options);
    return this;
  },
  
  undoDraggable: function() {
    if (this._draggable) this._draggable.destroy();
    return this;
  },
  
  makeDroppable: function(options) {
    new Droppable(this, options);
    return this;
  },
  
  undoDroppable: function() {
    if (this._droppable) this._droppable.destroy();
    return this;
  }
});
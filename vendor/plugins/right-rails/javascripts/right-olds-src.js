/**
 * This is old browsers support patch for RightJS
 *
 * The library released under terms of the MIT license
 * Visit http://rightjs.org for more details
 *
 * Copyright (C) 2008-2010 Nikolay V. Nemshilov
 */
/**
 * Old IE browser hacks
 *
 *   Keep them in one place so they were more compact
 *
 * Copyright (C) 2009-2010 Nikolay V. Nemshilov
 */
if (Browser.OLD) {
  // loads DOM element extensions for selected elements
  $ = (function(old_function) {
    return function(id) {
      var element = old_function(id);
      
      // old IE browses match both, ID and NAME
      if (element !== null && isString(id) && element.id !== id) 
        element = $$('#'+id)[0];
        
      return element ? Element.prepare(element) : element;
    }
  })($);
  
  
  $ext(document, {
    /**
     * Overloading the native method to extend the new elements as it is
     * in all the other browsers
     *
     * @param String tag name
     * @return Element
     */
    createElement: (function(old_method) {
      return function(tag) {
        return Element.prepare(old_method(tag));
      }
    })(document.createElement)
  });
  
  
  
  $ext(Element, {
    /**
     * IE browsers manual elements extending
     *
     * @param Element
     * @return Element
     */
    prepare: function(element) {
      if (element && element.tagName && !element.set) {
        $ext(element, Element.Methods, true);

        if (window.Form) {
          switch(element.tagName) {
            case 'FORM':
              Form.ext(element);
              break;

            case 'INPUT':
            case 'SELECT':
            case 'BUTTON':
            case 'TEXTAREA':
              Form.Element.ext(element);
              break;
          }
        }
      }
      return element;
    }
  });
  
  Element.include((function() {
    var old_collect = Element.Methods.rCollect;
    
    return {
      rCollect: function(attr, css_rule) {
        return old_collect.call(this, attr, css_rule).each(Element.prepare);
      }
    }
  })());
}

/**
 * Konqueror browser fixes
 *
 * Copyright (C) 2009-2010 Nikolay V. Nemshilov
 */

/**
 * manual position calculator, it works for Konqueror and also
 * old versions of Opera and FF, so we use a feature check in here
 */
if (!$E('p').getBoundingClientRect) {
  Element.include({
    position: function() {
      var left = this.offsetLeft, top = this.offsetTop, position = this.getStyle('position'),
        parent = this.parentNode, body = this.ownerDocument.body;
      
      // getting the parent node position
      while (parent && parent.tagName) {
        if (parent === body || parent.getStyle('position') != 'static') {
          if (parent !== body || position != 'absolute') {
            var subset = parent.position();
            left += subset.x;
            top  += subset.y;
          }
          break;
        }
        parent = parent.parentNode;
      }
      
      return {x: left, y: top};
    }
  });
  
  // Konq doesn't have the Form#elements reference
  Form.include({
    getElements: function() {
      return this.select('input,select,textarea,button');
    }
  })
}


/**
 * The manual css-selector feature implementation
 *
 * NOTE: this will define the standard css-selectors interface
 *       with the same names as native css-selectors implementation
 *       the actual public Element level methods for the feature
 *       is in the dom/selector.js file
 *
 * Credits:
 *   - Sizzle    (http://sizzlejs.org)      Copyright (C) John Resig
 *   - MooTools  (http://mootools.net)      Copyright (C) Valerio Proietti
 *
 * Copyright (C) 2009-2010 Nikolay V. Nemshilov
 */
if (!document.querySelector) {
  Element.include((function() {
    /**
     * The token searchers collection
     */
    var search = {
      // search for any descendant nodes
      ' ': function(element, tag) {
        return $A(element.getElementsByTagName(tag));
      },

      // search for immidate descendant nodes
      '>': function(element, tag) {
        var result = [], node = element.firstChild;
        while (node) {
          if (tag == '*' || node.tagName == tag)
            result.push(node);
          node = node.nextSibling;
        }
        return result;
      },

      // search for immiate sibling nodes
      '+': function(element, tag) {
        while (element = element.nextSibling) {
          if (element.tagName)
            return (tag == '*' || element.tagName == tag) ? [element] : [];
        }
        return [];
      },

      // search for late sibling nodes
      '~': function(element, tag) {
        var result = [];
        while (element = element.nextSibling)
          if (tag == '*' || element.tagName == tag)
            result.push(element);
        return result;
      }
    };
    
    
    /**
     * Collection of pseudo selector matchers
     */
    var pseudos = {
      checked: function() {
        return this.checked;
      },

      disabled: function() {
        return this.disabled;
      },

      empty: function() {
        return !(this.innerText || this.innerHTML || this.textContent || '').length;
      },

      'first-child': function(tag_name) {
        var node = this;
        while (node = node.previousSibling) {
          if (node.tagName && (!tag_name || node.tagName == tag_name)) {
            return false;
          }
        }
        return true;
      },

      'first-of-type': function() {
        return arguments[1]['first-child'].call(this, this.tagName);
      },

      'last-child': function(tag_name) {
        var node = this;
        while (node = node.nextSibling) {
          if (node.tagName && (!tag_name || node.tagName == tag_name)) {
            return false;
          }
        }
        return true;
      },

      'last-of-type': function() {
        return arguments[1]['last-child'].call(this, this.tagName);
      },

      'only-child': function(tag_name, matchers) {
        return matchers['first-child'].call(this, tag_name) 
          && matchers['last-child'].call(this, tag_name);
      },

      'only-of-type': function() {
        return arguments[1]['only-child'].call(this, this.tagName, arguments[1]);
      },

      'nth-child': function(number, matchers, tag_name) {
        if (!this.parentNode) return false;
        number = number.toLowerCase();

        if (number == 'n') return true;

        if (number.includes('n')) {
          // parsing out the matching expression
          var a = b = 0;
          if (m = number.match(/^([+-]?\d*)?n([+-]?\d*)?$/)) {
            a = m[1] == '-' ? -1 : parseInt(m[1], 10) || 1;
            b = parseInt(m[2], 10) || 0;
          }

          // getting the element index
          var index = 1, node = this;
          while ((node = node.previousSibling)) {
            if (node.tagName && (!tag_name || node.tagName == tag_name)) index++;
          }

          return (index - b) % a == 0 && (index - b) / a >= 0;

        } else {
          return matchers['index'].call(this, number.toInt() - 1, matchers, tag_name);
        }
      },

      'nth-of-type': function(number) {
        return arguments[1]['nth-child'].call(this, number, arguments[1], this.tagName);
      },

    // protected
      index: function(number, matchers, tag_name) {
        number = isString(number) ? number.toInt() : number;
        var node = this, count = 0;
        while ((node = node.previousSibling)) {
          if (node.tagName && (!tag_name || node.tagName == tag_name) && ++count > number) return false;
        }
        return count == number;
      }
    };
    
    // the regexps collection
    var chunker   = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?/g;
    var id_re     = /#([\w\-_]+)/;
    var tag_re    = /^[\w\*]+/;
    var class_re  = /\.([\w\-\._]+)/;
    var pseudo_re = /:([\w\-]+)(\((.+?)\))*$/;
    var attrs_re  = /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/;
  
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  
    /**
     * Builds an atom matcher
     *
     * @param String atom definition
     * @return Object atom matcher
     */
    var atoms_cache = {};
    function build_atom(atom) {
      if (!atoms_cache[atom]) {
        //
        // HACK HACK HACK
        //
        // I use those tiny variable names, case I'm gonna be nougty
        // and generate the matching function nasty way via evals and strings
        // and as the code will be compacted, the real variable names will be lost
        // unless they shortified to the minimum
        //
        // Here what the real variable names are
        //  i - for 'id' string
        //  t - for 'tag' name
        //  c - for 'classes' list
        //  a - for 'attributes' hash
        //  p - for 'pseudo' string
        //  v - for 'value_of_pseudo'
        //  
        var i, t, c, a, p, v, m, desc = {};
        
        // grabbing the attributes 
        while(m = atom.match(attrs_re)) {
          a = a || {};
          a[m[1]] = { o: m[2], v: m[5] || m[6] };
          atom = atom.replace(m[0], '');
        }
        
        // extracting the pseudos
        if (m = atom.match(pseudo_re)) {
          p = m[1];
          v = m[3] == '' ? null : m[3];
          atom = atom.replace(m[0], '');
        }
        
        // getting all the other options
        i = (atom.match(id_re) || [1, null])[1];
        t = (atom.match(tag_re) || '*').toString().toUpperCase();
        c = (atom.match(class_re) || [1, ''])[1].split('.').without('');
        
        desc.tag = t;
        
        // building the matcher function
        //
        // NOTE: we kinda compile a cutom filter function in here 
        //       the point is to create a maximally optimized method
        //       that will make only this atom checks and will filter
        //       a list of elements in a single call
        //
        if (i || c.length || a || p) {
          var filter = 'function(y){var e,r=[];for(var z=0,x=y.length;z<x;z++){e=y[z];_f_}return r}';
          var patch_filter = function(code) {
            filter = filter.replace('_f_', code + '_f_');
          };
          
          // adding the ID check conditions
          if (i) patch_filter('if(e.id!=i)continue;');
          
          // adding the classes matching code
          if (c.length) patch_filter(
            'if(e.className){var n=e.className.split(" ");if(n.length==1&&c.indexOf(n[0])==-1)continue;else{for(var i=0,l=c.length,b=false;i<l;i++)if(n.indexOf(c[i])==-1){b=true;break;}if(b)continue;}}else continue;'
          );
          
          // adding the attributes matching conditions
          if (a) patch_filter(
            'var p,o,v,b=false;for (var k in a){p=e.getAttribute(k)||"";o=a[k].o;v=a[k].v;if((o=="="&&p!=v)||(o=="*="&&!p.includes(v))||(o=="^="&&!p.startsWith(v))||(o=="$="&&!p.endsWith(v))||(o=="~="&&!p.split(" ").includes(v))||(o=="|="&&!p.split("-").includes(v))){b=true;break;}}if(b){continue;}'
          );
          
          // adding the pseudo matchers check
          if (p && pseudos[p]) {
            var s = pseudos;
            patch_filter('if(!s[p].call(e,v,s))continue;');
          }

          desc.filter = eval('['+ filter.replace('_f_', 'r.push(e)') +']')[0];
        }
        
        atoms_cache[atom] = desc;
      }
      
      return atoms_cache[atom];
    };
    
    /**
     * Builds a single selector out of a simple rule chunk
     *
     * @param Array of a single rule tokens
     * @return Function selector
     */
    var tokens_cache = {};
    function build_selector(rule) {
      var rule_key = rule.join('');
      if (!tokens_cache[rule_key]) {
        for (var i=0; i < rule.length; i++) {
          rule[i][1] = build_atom(rule[i][1]);
        }
        
        // creates a list of uniq nodes
        var _uid = $uid;
        var uniq = function(elements) {
          var uniq = [], uids = [], uid;
          for (var i=0, length = elements.length; i < length; i++) {
            uid = _uid(elements[i]);
            if (!uids[uid]) {
              uniq.push(elements[i]);
              uids[uid] = true;
            }
          }

          return uniq;
        };
        
        // performs the actual search of subnodes
        var find_subnodes = function(element, atom) {
          var result = search[atom[0]](element, atom[1].tag);
          return atom[1].filter ? atom[1].filter(result) : result;
        };
        
        // building the actual selector function
        tokens_cache[rule_key] = function(element) {
          var founds, sub_founds;
          
          for (var i=0, i_length = rule.length; i < i_length; i++) {
            if (i == 0) {
              founds = find_subnodes(element, rule[i]);

            } else {
              if (i > 1) founds = uniq(founds);

              for (var j=0; j < founds.length; j++) {
                sub_founds = find_subnodes(founds[j], rule[i]);

                sub_founds.unshift(1); // <- nuke the parent node out of the list
                sub_founds.unshift(j); // <- position to insert the subresult

                founds.splice.apply(founds, sub_founds);

                j += sub_founds.length - 3;
              }
            }
          }
          
          return rule.length > 1 ? uniq(founds) : founds;
        };
      }
      return tokens_cache[rule_key];
    };
    
    
    /**
     * Builds the list of selectors for the css_rule
     *
     * @param String raw css-rule
     * @return Array of selectors
     */
    var selectors_cache = {}, chunks_cache = {};
    function split_rule_to_selectors(css_rule) {
      if (!selectors_cache[css_rule]) {
        chunker.lastIndex = 0;
        
        var rules = [], rule = [], rel = ' ', m, token;
        while (m = chunker.exec(css_rule)) {
          token = m[1];
          
          if (token == '+' || token == '>' || token == '~') {
            rel = token;
          } else {
            rule.push([rel, token]);
            rel = ' ';
          }

          if (m[2]) {
            rules.push(build_selector(rule));
            rule = [];
          }
        }
        rules.push(build_selector(rule));
        
        selectors_cache[css_rule] = rules;
      }
      return selectors_cache[css_rule];
    };
    
    
    /**
     * The top level method, it just goes throught the css-rule chunks
     * collect and merge the results that's it
     *
     * @param Element context
     * @param String raw css-rule
     * @return Array search result
     */
    function select_all(element, css_rule) {
      var selectors = split_rule_to_selectors(css_rule), result = [];
      for (var i=0, length = selectors.length; i < length; i++)
        result = result.concat(selectors[i](element));
      
      if (Browser.OLD) result.forEach(Element.prepare);
      
      return result;
    };
    
    
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  
    // the previous dom-selection methods replacement
    var dom_extension = {
      first: function(css_rule) {
        return this.select(css_rule).first();
      },
      
      select: function(css_rule) {
        return select_all(this, css_rule || '*');
      }
    };
    
    // replacing the document-level search methods
    $ext(document, dom_extension);
    
    // patching the $$ function to make it more efficient
    window.$$ = function(css_rule) {
      return select_all(document, css_rule || '*');
    };
    
    // sending the extension to the Element#include
    return dom_extension;
  })());
}


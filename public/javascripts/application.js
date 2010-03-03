/***************** UTILITY FUNCTIONS *****************/
$.option_tags_from_model = function(model_class, models, options) {
	var attribute = options.attribute || 'name',
	 		select_prompt = options.select_prompt || false,
			option_tags = select_prompt ? '<option value="">' + select_prompt + '</option>' : '';
	
	$.each(models, function(i) {
		if (attribute == 'name' && !this[model_class]['name']) attribute = 'title';
		else if (attribute == 'title' && !this[model_class]['title']) attribute = 'name';
		
		option_tags += '<option value="' + this[model_class]['id'] + '">(' + this[model_class]['id'] +') ' + this[model_class][attribute] + '</option>';
	});
	
	return option_tags;
}

$.log = function(msg) {
	if (typeof console != 'undefined') console.log(msg); else alert(msg);
}

// take an array of actions and controllers to see if any pair of those match the page we're on
// either set can be a single action or controller as a string or a comma separated string of multiple actions or controllers
$.on_page = function(route_sets) { // routes looks like: [ ['edit, new', 'views, forms, links'], ['index', 'pages'] ]
	var actions,
			controllers,
			route = [
				$('body').attr('class').split(' ')[0].replace('_action', ''),
				$('body').attr('id').replace('_controller', '')
			]
	
	var i = route_sets.length;
	
	while (i--) { // iterate through all the action/controller sets
		actions 		= route_sets[i][0].split(/,\W?/);
		controllers = route_sets[i][1].split(/,\W?/);
		
		var j = actions.length;
		while (j--) { // check each action
			if (route[0] != actions[j]) continue; // skip to the next one
			
			var k = controllers.length;
			while (k--) { // action matched, now match with a controller
				if (route[1] == controllers[k]) return true;
			}
		}
	}
}

$.get_auth_token = function() {
	var token = $('input[name=authenticity_token]').val();
	return token;
}

$.validateAnimationAction = function(action) {
	return /^show$|^hide$|^slideDown$|^slideUp$/.test(action);
}

$.switch_action_hash = function(this_el, action, elementClass, contextClass) {
	action = $.switch_actions(action);
	$(this_el).attr('href', $(this_el).attr('href').split('#')[0] + '#' + action + '_' + elementClass + '_' + contextClass); 
	$(this_el).toggleClass('toggle_down');
}

$.switch_actions = function(action) {
	var action_sets = [
		['show',						'hide'],
		['fadeIn',			 'fadeOut'],
		['slideDown',		 'slideUp'],
		['addClass', 'removeClass']
	]
	
	var i = action_sets.length; 
	while (i--) { // return the opposite of the action in question
		if (action_sets[i].indexOf(action) >= 0) return action_sets[i][ (action_sets[i].indexOf(action) ^ 1) ];
	}
}

$.disable = function(disabler, disablee) {
	$(disablee, disabler.parent().parent()).each(function(i){
		if (this.name != disabler.attr('name')) $(this).attr('disabled', !disabler.data('enabled'));
	});
}

$.disableToggle = function(disabler, disablees) {
	disabler.data('enabled', !disabler.data('enabled'));
	$.disable(disabler, disablees);
}

// call a jquery show/hide method on matching element from the selectors present in the href
$.toggleAction = function(href, scroll_to_it) {
	var url_hash = href.split('#');
	
	if (url_hash[1]) {
		url_hash					= url_hash[1],
		 		action				= url_hash.split('_')[0],
				elementClass	= url_hash.split('_')[1],
				contextClass	= url_hash.split('_')[2],
				target			  = $('.' + elementClass, '.' + contextClass);
		
		// validate action name and do it.
		if ($.validateAnimationAction(action)) {
			var context = $('.' + contextClass);
			var actionLink = $('.toggle_action', context);
			
			if (actionLink.length) $.switch_action_hash($('.toggle_action', context), action, elementClass, contextClass);
			
			if (scroll_to_it) $(document).scrollTo(context, 800);
			
			target[action]();
		}
	}
	
}

/******************************************* JQUERY PLUGINS *******************************************/

$.fn.disabler = function(d) { // master switch checkbox, disables all form inputs when unchecked
	var disablees = d || 'input, textarea, select, checkbox, radio';
	return this.each(function(i){
		var $this = $(this);
		
		$this.data('enabled', $this.is(':checked'));
		$.disable($this, disablees);
		
		$this.change(function(){ $.disableToggle($this, disablees) });
	});
}

// watches for anchors in window.location that have valid a element id in spot1 of the hash (#[spot1]_spot2)
// toggle open the container with that id and if theres a valid id in spot2 scroll to on an anchor with id == spot2
$.fn.anchorDispatch = function() {
	var url_hash, listeningElement, anchor;
	
	url_hash = window.location.href.split('#')[1];
	if (!url_hash) 
		return false;
	
	if ($.validateAnimationAction(url_hash.split('_')[0])) 
		return false
	
	listeningElement = $('#' + url_hash.split('_')[0]);
	if (!listeningElement) 
		return false;

	if (url_hash.split('_')[1]) anchor = $('#' + url_hash.split('_')[1]);

	return this.each(function(i){
		if (this.id == listeningElement.attr('id')) {
			listeningElement.show();
			$('.collapseable', listeningElement).show().removeClass('hide');
			$('.toggle_action', listeningElement).addClass('toggle_down');

			if (anchor) {
				$(document).scrollTo(anchor, 2000);
				anchor.parent().effect('highlight', { color: '#87c881' }, 7000);
			}
		}
	});

} // END $.fn.anchorDispatch()

// click any where on a rowCheckable div to toggle the checkbox within the first child element
$.fn.rowCheckable = function() {
	return this.each(function() {
		var $this = $(this),
		 		checkbox = $('input[type=checkbox]', $this).eq(0);//$this.children().eq(0).children('input[type=checkbox]');
		
		$this.click(function(e) { // trigger checkbox unless a link is clicked
			if (e.target.tagName == e.currentTarget.tagName) {
				checkbox.trigger('change').attr('checked', !checkbox.is(':checked'));
			}
		});
	});
}

// use a checkbox to switch between two containers. classes: .pane_0, .pane_1
$.fn.paneSwitcher = function() {
	return this.each(function() {
		var context = $(this).parent().parent().parent();
		this.checked ? $('#pane_0', context).hide() : $('#pane_1', context).hide();
		
		$(this).change(function() { // trigger checkbox unless a link is clicked
			$('.pane_switchable', context).slideToggle();
		});
	});
}

/******************************************* SUCCESS CALLBACKS *******************************************/

$.toggleHelptext = function(clickedLink) {
	// if the link has a rel attribute, we are going to show the inner div of the container with class == rel
	$('.inner', '.' + clickedLink.attr('rel')).stop().slideToggle().toggleClass('hide');
	$('.ajax_action', clickedLink.parent()).toggleClass('hide');
	clickedLink.parent('.helptext_options').toggleClass('bg_green');
}

/******************************************* EVENT HANDLERS *******************************************/

// removed jQuery ready call since the scripts are at the bottom of the layout
//jQuery(function(){
	
	var $ = jQuery;
	$('body').addClass('js');
	$('.hide_if_js').hide();
	
	$.toggleAction(window.location.href, true); // toggle a container if its id is in the url hash
	
	$('.hintable').hinty();  // all matched inputs will display their title attribute
	$('form').formBouncer(); // form validation, fields with supported validation classes will be processed
	
	$('.disabler', '.disabled').disabler(); // checkbox that disables all inputs in its form
	$('.anchorListener').anchorDispatch();  // a toggle an element when its id is present in the url hash
	$('.row_checkable').rowCheckable();			// clicking a whole form also enables its first checkbox
	$('.pane_switch').paneSwitcher();				// use a checkbox to switch between two containers. classes: .pane_0, .pane_1
	
	$('input', '.ajax_form').live('change', function(){
	  $(this).parent().parent().ajaxSubmit({
	    beforeSubmit: function(a,f,o) {
	      o.dataType = 'json';
	    },
	    complete: function(XMLHttpRequest, textStatus) {
	      // XMLHttpRequest.responseText will contain the URL of the uploaded image.
	      // Put it in an image element you create, or do with it what you will.
	      // For example, if you have an image elemtn with id "my_image", then
	      //  $('#my_image').attr('src', XMLHttpRequest.responseText);
	      // Will set that image tag to display the uploaded image.
	    },
	  });
	});
	
	// admin menu hover behaviors
	var GR_content_menu_hover_interval,
			GR_resource_list = $('#resource_list');
	$('#content_menu_link').mouseover(function() {
		GR_resource_list.slideDown();
		return false;
	});
	$('#resource_list, #content_menu_link').mouseout(function(){
		GR_content_menu_hover_interval = setTimeout('GR_resource_list.slideUp()', 1000);
	});
	$('#resource_list, #content_menu_link').mouseover(function(){
		clearInterval(GR_content_menu_hover_interval);
	});
	
	$('.unique_checkbox').click(function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	$('.unique_checkbox').click(function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	// TODO: fix the toggle button, it doesn't turn off the editor, find out where the editor remove function is
	$('textarea.wysiwyg').each(function(i) {
		var textarea = jQuery(this),
				toggle = jQuery('<a href="#" class="toggle right" id="toggle_' + i + '">Toggle Editor</a>');
		
		textarea.parent().parent().prepend(toggle);
		
		toggle.click(function() {
			CKEDITOR.replace(textarea.attr('name'));
			return false;
		});
	});
	
	// toggle_links have a hash (#) of: #action_elementClass_contextClass 
	// e.g. #show_examples_helptext => $('.examples', '.helptext').show();
	$('.toggle_action').click(function() {
		$.toggleAction(this.href, false);
		return false;
	});
	
	// ajax links point to the ajax_controller, the href contains an action, and other key-values pairs such as model class,
	// model id, the attribute to update, and the value, see the ajax_controller for other actions and required params
	// use conditional logic to handle the success callback based on attributes of the clicked link, 
	// such as what element to update on success, or what part of the dom should change 
	$('.ajax_action').click(function(){
		var $this = $(this);
		$this.addClass('loading');
		
		if (!$this.hasClass('before_confirm') || ($this.hasClass('before_confirm') && confirm($this.attr('title') + '?'))) {
			$.getJSON(
				this.href + '&authenticity_token=' + $.get_auth_token(), {},
				function(response) {
					$this.removeClass('loading');
					
					if (response.success) {
						// need better conditional logic for these links
						if ($this.attr('rel') == 'helptext') {
							$.toggleHelptext($this);
							
						} else if ($this.hasClass('delete_link')) {
							$this.parent().parent().slideUp(300, function(){ $(this).remove(); });
						}
						
					} else alert(response.data);
				}
			);
		} else $this.removeClass('loading');
		
		return false;
	});
	
	// Partial addables, grab html from a div and add it to the form, used on forms and permissions create and edit
	if ($('.partial_addable').length > 0) {
		$('.add_link', '.partial_addable').click(function(){
			var $this 			= $(this),
					context 		= '#' + $this.attr('rel'),
					partial_form = $($('.partial_form_html', context).html());
		
			$('input, select, checkbox', partial_form).each(function(){ $(this).attr('disabled', false); });
		
			partial_form.hide().prependTo('.partial_forms_wrap', context).slideDown(600);
		
			return false;
		});
		
		$('.cancel_link', '.partial_addable').click(function(){
			$(this).parent().parent().remove(); 
			return false; 
		});
	}
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/
	
	// Views/Forms/Links Edit
	if ($.on_page([['edit, new', 'views, forms, links']])) {
		var scope_down = ''; 
		if ($.on_page([['edit, new', 'views']])) scope_down = 'owner';
		else scope_down = 'target';
		
		// when the user chooses a scope (aka resource), show the scope-dependent owner_id or target_id dropdown
		// which is populated by models of the selected scope class
		var scoping_fields = $('#scope_' + scope_down + '_fields', '#body');
		
		if ($('.scope_down_hidden', scoping_fields).val()) { // preselect owner or target from dropdown
			var scoper_id = $('.scope_down_hidden', scoping_fields).val();
			
			scoping_fields.children().each(function(){
				if (this.value == scoper_id) this.selected = 'selected';
			});
		} else scoping_fields.hide();
		
		// grab model instances that are of the selected class
		$('.scope_dropdown', '#scope_fields').change(function(){
			var $this = $(this);
			
			if ($this.val() != '') { // retrieve all models of this class
				scoping_fields.show(100);
				scoping_dropdown = $('.scoping_dropdown', scoping_fields);
				scoping_dropdown.html('<option>Loading ' + $this.val() + '...</option>');
				
				$.getJSON(
					'/ajax/get_all',
					{ model: $this.val(), authenticity_token: $.get_auth_token() },
					function(response) {
						if (response.success) {
							var args = { attribute: 'name', select_prompt: (scoping_dropdown.hasClass('no_prompt') ? '' : 'Active Context') }
							var option_tags = $.option_tags_from_model($this.val(), response.data, args);
							scoping_dropdown.html(option_tags);
							
						} else {
							scoping_dropdown.html('<option>Error Loading Records</option>')
						}
					}
				);
			} else scoping_fields.hide(300);
		}); // END .scope_dropdown.change()
		
		$('.delete_link', '#form_builder').live('click', function(){
			var $this = $(this),
					field_id = $(this).attr('rel').replace('field_', '');
			
			
			$this.parent().parent().html()
			
			return false;
		});
		
	} // END Views/Forms Edit
	
	
//});

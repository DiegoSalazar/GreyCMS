# Filters added to this controller apply to all controllers in the application.
# Likewise, all the methods added will be available for all controllers.
#require 'PP' if RAILS_ENV == 'development'
class ApplicationController < ActionController::Base
  helper :all # include all helpers, all the time
  protect_from_forgery # See ActionController::RequestForgeryProtection for details

  # Scrub sensitive parameters from your log
  filter_parameter_logging :password, :password_confirmation
  helper_method :current_user_session, 
                :current_user, 
                :_crud,
                :regions,    # for blocks_model_form
                :view_types, # for model_view_form
                :models,     # for model_view_form
                :blocks_models,           # for the add_blocks_for helper
                :model_blocks_for_region, # for the add_blocks_for helper
                :rest_methods,  # for the virtual forms builder
                :_actions,      # for the virtual forms builder
                :_controllers,  # for the virtual forms builder
                :_field_types,  # for the virtual forms builder
                :_page_actions, # suggestions form
                :_models_having_assoc,
                :_models_with_title,
                :in_edit_mode?,
                :reject_blocks_enabled_on_this, # for the blocks_fields
                :reject_views_enabled_on_this,  # for the blocks_fields
                :reject_forms_enabled_on_this   # for the blocks_fields
  
  include UtilityMethods
  
  # for the SharedModelMethod module
  $regions    = [:header, :banner, :sidebar, :left, :right, :content_bottom, :column_5, :column_6, :column_7, :column_8, :footer]
  $view_types = [:list, :blog_roll, :box, :table]
  
  # for the virtual forms, build forms
  $_actions     = [:index, :show, :create, :update]
  $_field_types = [:text_field, :text_area, :select, :check_box, :radio, :hidden]
  
  # suggestions form
  $_page_actions = [:index, :show, :new, :edit]
  
  # authorization system
  $_crud = [:create, :read, :update, :delete]
  
  before_filter :init
  
  layout (session ? (session[:layout] || 'greyrobotRD') : 'greyrobotRD')
  
  def local_request?
    true if current_user
  end
  
  protected # ---------------------------------------------
  
  def model_errors(model)
    model.errors.full_messages.map { |e| "<p>#{e}</p>" }
  end
  
  def return_or_back(params)
    params[:return].nil? ? redirect_to(:back) : redirect_to(params[:return])
  end
  
  private # -----------------------------------------------
  
  def init
    set_session_vars
    get_content_vars
    get_list_of_controllers_for_menu if current_user
  end
  
  def set_session_vars
    if params[:return_to]
      session[:return_to] = params[:return_to]
    elsif current_user && in_mode?('index', 'edit', 'show')
      store_location
    end
    set_default_view_type
  end
  
  def get_content_vars
    @controller_name = controller_name
    @action_name = action_name
    
    @default_view_type = session[:view_type]
    
    @theme_css = theme_css(session[:theme] || 'greyrobotRD')
    
    @plugins = ['plugins/jquery.formbouncer', 'plugins/jquery.hinty']
    @widgets_js = []
    
    @nav_pages = Page.find_all_by_show_in_nav(true)
    @global_blocks = Block.all(:conditions => ['show_in_all in (?)', regions(false).map(&:to_s)])

    @roles = Role.all
  end
  
  # TODO move this feature into the database and save state through AJAX, using a key-val pair { :controller_name => :view_type }
  def set_default_view_type
    model_class = controller_name.singular.camelcase.constantize
    
    if !params[:view_type].blank?
      session[:view_type] = params[:view_type]
    elsif controller_name == 'posts'
      session[:view_type] = 'blog_roll'
    elsif controller_name == 'permissions'
      session[:view_type] = 'table'
    elsif model_class.respond_to?('column_names') && model_class.column_names.include?('image_file_name')
      session[:view_type] = 'box'
    elsif model_class.respond_to?('column_names') && model_class.column_names.include?('content')
      session[:view_type] = 'table'
    else
      session[:view_type] = 'list'
    end
  end
  
  #--------------------- Fetch Arrays, for select lists, etc. ---------------------
  
  def get_list_of_controllers_for_menu
    @controllers ||= get_list_of_file_names('controllers').reject! { |c| c =~ /^application|^user_sessions|^ajax/i }
    @controllers.map { |c| c.gsub!('_controller', '') }
  end
  
  def get_list_of_file_names(dir, remove = '.rb')
    Dir.new("#{RAILS_ROOT}/app/#{dir}").entries.reject { |f| f =~ /^\.|^\.\./i }.map { |f| f.gsub(remove, '') }
  end
  
  def models(for_select = true, plural = true)
    models = get_models_with_name_or_title(get_list_of_file_names('models'))
    fetch_array_for models, for_select, plural
  end
  
  def get_models_with_name_or_title(model_names)
    model_names.map do |name|
      model_class = name.camelcase.constantize
      next unless model_class.respond_to?('column_names')
      
      model_columns = model_class.column_names
      model_columns.include?('name') || model_columns.include?('title') ? name : nil
    end.reject(&:nil?)
  end
  
  def _crud(for_select = true)
    fetch_array_for $_crud, for_select
  end
  
  def regions(for_select = true)
    fetch_array_for $regions, for_select
  end
  
  def view_types(for_select = true)
    fetch_array_for $view_types, for_select
  end
  
  def _controllers(for_select = true)
    fetch_array_for get_list_of_file_names('controllers', '_controller.rb'), for_select
  end
  
  def _actions(for_select = true)
    fetch_array_for $_actions, for_select
  end
  
  def _page_actions(for_select = true)
    fetch_array_for $_page_actions, for_select
  end
  
  def _field_types(for_select = true)
    fetch_array_for $_field_types, for_select
  end
  
  def _models_having_assoc(for_select = false)
    models_array = filter_dir_entries('models') do |entry|
      model_class = entry.camelcase.constantize
      
      model_class.respond_to?('column_names') &&
      (model_columns.any? { |c| c != 'parent_id' && c =~ /^(.*_id)$/i } || entry =~ /(user)|(page)|(tag)/)
    end
    
    fetch_array_for models_array, for_select
  end
  
  def _models_with_title(for_select = false)
    models_array = filter_dir_entries('models') do |entry|
      model_class = entry.camelcase.constantize
      model_class.respond_to?('title')
    end
    
    fetch_array_for models_array, for_select
  end
  
  def filter_dir_entries(dir, &filter)
    get_list_of_file_names('models').each do |entry|
      (entries ||= []) << entry if yield(entry)
    end
  end
  
  def fetch_array_for(array, for_select = true, plural = false) # => [ ['Subnav', 'subnav'], ... ]
    for_select ? array.map { |a| (plural ? "#{a}".pluralize : "#{a}").titleize }.zip(array) : array
  end
  
  #--------------------- Model Retrieval ---------------------
  
  # before filters
  def get_models
    eval "@#{controller_name} = #{controller_name.singular.camelcase}.all"
  end
  
  def get_model
    eval "@#{controller_name.singular} = #{controller_name.singular.camelcase}.find(params[:id])"
  end
  
  # for the shared blocks_model_form
  def get_blocks
    @blocks = Block.all(:conditions => 'show_in_all IS NULL OR show_in_all = ""')
  end
  
  def blocks_models
    # get models names that have blocks, for the add_blocks_for helper
    @blocks_model = BlocksModel.all.map{ |bm| bm.model_type.downcase }.uniq
  end
  
  def get_active_model
    @active_model ||= eval("@#{controller_name.singular}")
  end
  
  def reject_blocks_enabled_on_this(model, blocks)
    @disabled_blocks ||= reject_models_enabled_on_this(model, blocks)
  end
  
  def reject_views_enabled_on_this(block, views)
    @disabled_views ||= reject_models_enabled_on_this(block, views)
  end
  
  def reject_forms_enabled_on_this(block, forms)
    @disabled_forms ||= reject_models_enabled_on_this(block, forms)
  end
  
  def reject_models_enabled_on_this(model, models)
    disabled_models = models.reject { |me| me.enabled_in? model }
  end
  
  #--------------------- Authlogic ---------------------
  
  def current_user_session
    @current_user_session ||= UserSession.find
  end

  def current_user
    @current_user ||= current_user_session ? current_user_session.record : nil
  end

  def require_user
    unless current_user
      store_location
      flash[:warning] = "You must be logged in to have #{action_name} access to #{controller_name}"
      redirect_to new_user_session_path
      return false
    end
  end

  def require_no_user
    if current_user
      store_location
      flash[:warning] = 'You must be logged out to do that'
      redirect_to current_user
      return false
    end
  end
  
  def reset_session
    session
  end
  
  def store_location
    session[:return_to] = request.request_uri
  end
  
  def redirect_back_or_default(default)
    redirect_to(session[:return_to] || default)
    session[:return_to] = nil
  end
  
  #--------------------- Utility Methods ---------------------
  
  def theme_css(name) # => output a theme css path for the stylesheet_link helper
    "themes/#{name}/style"
  end
  
  def in_edit_mode?
    in_mode?('edit')
  end
  
  def in_mode?(*modes)
    [modes].flatten.any? { |m| action_name == m }
  end
  
  def custom404
    raise ['custom404', params].pretty_inspect
  end
  
end

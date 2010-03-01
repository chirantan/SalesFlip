class Lead
  include MongoMapper::Document
  include HasConstant
  include ParanoidDelete
  include Permission
  include Trackable

  key :user_id,       ObjectId, :required => true, :index => true
  key :first_name,    String, :required => true
  key :last_name,     String, :required => true
  key :email,         String
  key :phone,         String
  key :status,        Integer
  key :source,        Integer
  key :rating,        Integer
  key :campaign_id,   ObjectId, :index => true
  key :notes,         String

  key :title,         Integer
  key :salutation,    Integer
  key :company,       String
  key :alternative_email, String
  key :mobile,        String
  key :address,       String
  key :referred_by,   String
  key :do_not_call,   Boolean

  key :website,       String
  key :twitter,       String
  key :linked_in,     String
  key :facebook,      String
  key :xing,          String
  timestamps!

  belongs_to :user
  has_many :comments, :as => :commentable
  has_many :tasks, :as => :asset
  has_many :activities, :as => :subject

  before_validation_on_create :set_initial_state
  after_create  :log_creation
  after_update  :log_update

  has_constant :titles, lambda { I18n.t('titles') }
  has_constant :statuses, lambda { I18n.t('lead_statuses') }
  has_constant :sources, lambda { I18n.t('lead_sources') }
  has_constant :salutations, lambda { I18n.t('salutations') }

  named_scope :with_status, lambda {|statuses| { :conditions => {
    :status => statuses.map {|status| Lead.statuses.index(status) } } } }

  def full_name
    "#{first_name} #{last_name}"
  end
  alias :name :full_name

  def promote!( account_name, options = {} )
    begin
      account = Account.find_by_id(Mongo::ObjectID.from_string(account_name))
    rescue Mongo::InvalidObjectID => e
      logger.debug e
    end
    unless account
      if options[:permission] == 'Lead'
        permission = self.permission
        permitted = self.permitted_user_ids
      else
        permission = options[:permission]
        permitted = options[:permitted_user_ids]
      end
      account = self.user.accounts.create :permission => permission,
        :name => account_name, :permitted_user_ids => permitted
    end
    contact = Contact.create_for(self, account)
    @recently_converted = true
    if account.valid? and contact.valid?
      I18n.locale_around(:en) { update_attributes :status => 'Converted' }
    end
    return account, contact
  end

  def reject!
    @recently_rejected = true
    I18n.locale_around(:en) { update_attributes :status => 'Rejected' }
  end

protected
  def set_initial_state
    I18n.locale_around(:en) { self.status = 'New' unless self.status }
  end

  def log_creation
    @recently_created = true
    Activity.log(user, self, 'Created')
  end

  def log_update
    case
    when @recently_converted then Activity.log(user, self, 'Converted')
    when @recently_rejected then Activity.log(user, self, 'Rejected')
    when @recently_destroyed then Activity.log(user, self, 'Deleted')
    else
      Activity.log(user, self, 'Updated')
    end
  end
end

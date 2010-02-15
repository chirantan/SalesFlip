class Contact
  include MongoMapper::Document
  include HasConstant

  key :account_id,          ObjectId, :required => true, :index => true
  key :user_id,             ObjectId, :required => true, :index => true
  key :lead_id,             ObjectId, :index => true
  key :assignee_id,         ObjectId, :index => true
  key :first_name,          String, :required => true
  key :last_name,           String, :required => true
  key :access,              Integer
  key :title,               Integer
  key :department,          String
  key :source,              String
  key :email,               String
  key :alt_email,           String
  key :phone,               String
  key :mobile,              String
  key :fax,                 String
  key :website,             String
  key :linked_in,           String
  key :facebook,            String
  key :twitter,             String
  key :xing,                String
  key :address,             String
  key :born_on,             Date
  key :do_not_call,         Boolean
  key :deleted_at,          Time
  timestamps!

  has_constant :accesses, lambda { I18n.t('access_levels') }
  has_constant :titles, lambda { I18n.t('titles') }

  belongs_to :account
  belongs_to :user
  belongs_to :assignee, :class => 'User'

  def full_name
    "#{first_name} #{last_name}"
  end

  def self.create_for( lead, account )
    contact = account.contacts.create :user => lead.user, :first_name => lead.first_name,
      :last_name => lead.last_name
  end
end
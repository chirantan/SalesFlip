class GoogleAccount
  include Mongoid::Document
  include Mongoid::Timestamps

  field :email
  field :password

  belongs_to_related :user

  validates_presence_of :user
  validates_presence_of :email
  validates_uniqueness_of :password
end

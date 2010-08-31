Salesflip::Application.routes.draw do
  devise_for :admins, :users

  root :to => 'pages#index'

  match 'profile', :to => 'users#profile'

  resources :users, :comments, :tasks, :accounts, :contacts, :attachments, :deleted_items,
    :searches, :invitations, :emails

  resources :leads do
    member do
      get :convert
      put :promote
      put :reject
    end
    get :export, :on => :collection
  end

  namespace :admin do
    root :to => 'configurations#show'
    resource :configuration
  end
end

Gem::Specification.new do |s|
  s.name    = 'right-rails'
  s.version = '0.4.4'
  s.date    = '2010-01-16'
  
  s.summary = "RightJS plugin for Rails"
  s.description = "RightRails provides support of the RightJS framework with transparent Rails/Prototype replacements, plus it has a new RJS processor, the most common ajax operations interface, RightJS own features support, remote files uploading handler, etc."
  
  s.authors  = ['Nikolay Nemshilov']
  s.email    = 'nemshilov@gmail.com'
  s.homepage = 'http://github.com/MadRabbit/right-rails'

  s.post_install_message = %q{
<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< RIGHT RAILS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  Please run the following command to copy RightJS scripts and modules in place
  
  script/generate right_rails

<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< RIGHT RAILS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  }

  
  s.files = Dir['generators/**/*'] + Dir['javascripts/**/*'] + Dir['lib/**/*'] + Dir['spec/**/*']
  s.files+= %w(
    README.textile
    CHANGELOG
    MIT-LICENSE
    Rakefile
    init.rb
  )
end
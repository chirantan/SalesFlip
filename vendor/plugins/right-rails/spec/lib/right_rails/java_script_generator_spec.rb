require File.dirname(__FILE__) + "/../../spec_helper.rb"

#
# Fake active-record and active resource classes to work with
#
module ActiveRecord
  class Base
    def initialize(hash={})
      @hash = hash
    end
    
    def id
      @hash[:id]
    end
    
    def self.table_name
      name = 'records'
      name.stub!(:singularize).and_return('record')
      name
    end
    
    def new_record?
      true
    end
  end
end

module ActiveResource
  class Base
  end
end

describe RightRails::JavaScriptGenerator do
  before :each do
    @template = mock()
    def @template.dom_id(record) "record_#{record.id}" end
    def @template.escape_javascript(str) str end
    
    @page = RightRails::JavaScriptGenerator.new(@template)
  end
  
  describe "top level calls" do
    it "should generate a simple ID search" do
      @page['element-id']
      @page.to_s.should == '$("element-id");'
    end
    
    it "should respond to the top-level javascript objects" do
      @page.document
      @page.to_s.should == 'document;'
    end

    it "should generate an ID search from active-records and active-resources" do
      @record = ActiveRecord::Base.new({:id => '22'})
      @page[@record]
      @page.to_s.should == '$("record_22");'
    end
    
    it "should generate a CSS select block" do
      @page.find('div, span, table')
      @page.to_s.should == '$$("div, span, table");'
    end
    
    it "should generate redirect" do
      @page.redirect_to('/boo/boo/boo')
      @page.to_s.should == 'document.location.href="/boo/boo/boo";'
    end
    
    it "should generate reload" do
      @page.reload
      @page.to_s.should == 'document.location.reload();'
    end
    
    it "should process assignments" do
      @page.something = nil;
      @page.to_s.should == 'something=null;'
    end
    
    it "should provide access to javascript context variables" do
      @page.get(:my_var).property = 'boo';
      @page.to_s.should == 'my_var.property="boo";'
    end
    
    it "should let you set the variables" do
      @page.set(:my_var, nil)
      @page.to_s.should == 'var my_var=null;'
    end
    
    it "should process << pushes correctly" do
      @page << 'some_code();' << 'another_code();'
      @page.to_s.should == 'some_code();another_code();'
    end
    
    it "should convert several lines of code properly" do
      @page['el1'].update('text1').show();
      @page['el2'].update('text2').highlight();
      
      @page.to_s.should == '$("el1").update("text1").show();$("el2").update("text2").highlight();'
    end
  end
  
  describe "second level calls" do
    it "should catch up an element method simple calls" do
      @page['element-id'].myMethod
      @page.to_s.should == '$("element-id").myMethod();'
    end

    it "should catch up an element method arguments as well" do
      @page['element-id'].myMethod(1,2,3)
      @page.to_s.should == '$("element-id").myMethod(1,2,3);'
    end

    it "should catch up with element property calls" do
      @page['element-id'][:innerHTML]
      @page.to_s.should == '$("element-id").innerHTML;'
    end

    it "should catch up with element properties call chains" do
      @page['element-id'].test(1).show.highlight()
      @page.to_s.should == '$("element-id").test(1).show().highlight();'
    end
    
    it "should catch up the assignments correctly" do
      @page['element-id'].innerHTML  = nil;
      @page.to_s.should == '$("element-id").innerHTML=null;'
    end
    
    it "should catch the property assignment calls too" do
      @page['element-id'][:title] = 'something';
      @page.to_s.should == '$("element-id").title="something";'
    end
    
    it "should process other methods calls as arguments" do
      @page['element-id'].update(@page.my_method(@page.another_method(1,2),3,nil))
      @page.to_s.should == '$("element-id").update(my_method(another_method(1,2),3,null));'
    end
    
    it "should process operation calls" do
      @page.property = @page.first + @page.another(1,nil) * @page.more / 2 -
        @page.get(:thing) / @page.another(2) + nil - 'boo' + @page.last(@page.first)
        
      @page.to_s.should == 'property=first()+another(1,null)*more()/2-thing/another(2)+null-"boo"+last(first());'
    end
    
    it "should process the append operation" do
      @page['element'][:innerHTML] << 'boo'
      @page.to_s.should == '$("element").innerHTML+="boo";'
    end
  end
  
  describe "data types conversion" do
    it "should correctly process numeric arguments" do
      @page['element-id'].test(1, 2.3)
      @page.to_s.should == '$("element-id").test(1,2.3);'
    end

    it "should correctly process boolean and nil values" do
      @page["element-id"].test(true, false, nil)
      @page.to_s.should == '$("element-id").test(true,false,null);'
    end

    it "should escape string arguments properly" do
      @template.should_receive(:escape_javascript).with('"quoted"').and_return('_quoted_')
      @page["element-id"].test('"quoted"')
      @page.to_s.should == '$("element-id").test("_quoted_");'
    end

    it "should convert symbols into object reverences" do
      @page["element-id"].test(:name1, :name2, :name3)
      @page.to_s.should == '$("element-id").test(name1,name2,name3);'
    end

    it "should handle arrays properly" do
      @template.should_receive(:escape_javascript).with('"quoted"').and_return('_quoted_')

      @page["element-id"].test([1,2.3,[nil,[true,'"quoted"']]])
      @page.to_s.should == '$("element-id").test([1,2.3,[null,[true,"_quoted_"]]]);'
    end

    it "should handle hashes properly" do
      @page["element-id"].test({
        :one => 1,
        :two => 2.3,
        'four' => {
          'five' => true,
          'six'  => nil
        }
      })
      @page.to_s.should == '$("element-id").test({"four":{"five":true,"six":null},one:1,two:2.3});'
    end
    
    it "should handle JSON exportable units too" do
      @value = ActiveRecord::Base.new({:id => '22'});
      def @value.to_json
        {:id => id}
      end
      
      @page["element-id"].test(@value)
      @page.to_s.should == '$("element-id").test({id:"22"});'
    end
    
    it "should convert lambdas to functions" do
      @page.find("boo").each(lambda{ |item, i, array|
        item.boo(i.foo(2)) + array.hoo
      })
      @page.to_s.should == '$$("boo").each(function(a,b,c){a.boo(b.foo(2))+c.hoo();});'
    end
    
    it "should process blocks nicely" do
      @page.find("boo").each do |item, i|
        item.boo(i.foo('hoo'))
      end
      
      @page.to_s.should == '$$("boo").each(function(a,b){a.boo(b.foo("hoo"));});'
    end
    
    it "should process blocks with scope variables and the page builder calls" do
      some_text = 'boo'
      
      @page.find("foo").each do |item, index|
        @page['element'][:innerHTML] << item[:innerHTML] + index + some_text
      end
      
      # checking that the context is getting back
      @page.alert(@page['element'][:innerHTML])
      
      @page.to_s.should == '$$("foo").each(function(a,b){$("element").innerHTML+=a.innerHTML+b+"boo";});alert($("element").innerHTML);'
    end
  end
  
  describe "RR object method calls generator" do
    before :each do
      @record = ActiveRecord::Base.new({:id => '22'})
    end
    
    it "should generate script for the 'insert' request" do
      @template.should_receive(:render).with(@record).and_return('<record html code/>')
      
      @page.insert(@record)
      @page.to_s.should == 'RR.insert("records","<record html code/>");'
    end
    
    it "should generate script for the 'replace' request" do
      @template.should_receive(:render).with(@record).and_return('<record html code/>')
      
      @page.replace(@record)
      @page.to_s.should == 'RR.replace("record_22","<record html code/>");'
    end
    
    it "should generate script for the 'remove' request" do
      @page.remove(@record)
      @page.to_s.should == 'RR.remove("record_22");'
    end
    
    it "should generate script for the 'show_form_for' request" do
      @template.should_receive(:render).with('form').and_return('<the form html code/>')
      
      @page.show_form_for(@record)
      @page.to_s.should == 'RR.show_form_for("record_22","<the form html code/>");'
    end
    
    describe "replace_form_for generator" do
      before :each do
        @template.should_receive(:render).with('form').and_return('<the form html code/>')
      end
      
      it "should generate a script for a new record" do
        @record.should_receive(:new_record?).and_return(true)

        @page.replace_form_for(@record)
        @page.to_s.should == 'RR.replace_form("new_record","<the form html code/>");'
      end
      
      it "should generate a script for an existing record" do
        @record.should_receive(:new_record?).and_return(false)

        @page.replace_form_for(@record)
        @page.to_s.should == 'RR.replace_form("edit_record_22","<the form html code/>");'
      end
    end
    
    describe "updates with care" do
      before :each do
        @template.should_receive(:flashes).and_return('<flashes/>')
        @template.should_receive(:flash).and_return(mock(:flash, {:clear => true}))
      end
      
      it "should generate response for #update_flash" do
        @page.update_flash
        @page.to_s.should == 'RR.update_flash("<flashes/>");'
      end

      it "should generate response for the #insert_and_care method" do
        @template.should_receive(:render).with('form').and_return('<the form html code/>')
        @template.should_receive(:render).with(@record).and_return('<record html code/>')

        @page.insert_and_care(@record)

        @page.to_s.should == 'RR.insert("records","<record html code/>");' +
          'RR.replace_form("new_record","<the form html code/>");' +
          'RR.update_flash("<flashes/>");'
      end
      
      it "should generate response for the #replace_and_care method" do
        @template.should_receive(:render).with(@record).and_return('<record html code/>')

        @page.replace_and_care(@record)

        @page.to_s.should == 'RR.replace("record_22","<record html code/>");' +
          'RR.update_flash("<flashes/>");'
      end
    end
    
  end
  
  
end